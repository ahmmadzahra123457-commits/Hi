import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_ID = "gemini-3.1-flash-lite";

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedAiClient;
}

function getReadableError(err: unknown): { status: number; message: string } {
  if (err && typeof err === "object") {
    const anyErr = err as { status?: number; message?: string; code?: number };
    const status = anyErr.status || anyErr.code || 500;
    const message = anyErr.message || "An unexpected AI service error occurred.";
    if (message.includes("API_KEY_INVALID") || status === 403 || status === 401) {
      return {
        status: 403,
        message: "API key is missing or invalid. Please check your key in Settings > Secrets.",
      };
    }
    if (message.includes("RESOURCE_EXHAUSTED") || status === 429) {
      return {
        status: 429,
        message: "Rate limit reached. Please wait a moment and try again.",
      };
    }
    return { status: typeof status === "number" && status >= 400 ? status : 500, message };
  }
  return { status: 500, message: "An unexpected server error occurred." };
}

interface ChatTurn {
  role: "user" | "model";
  text: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // Streaming AI Chat Assistant (tuned for minimal latency)
  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    try {
      const { message, history = [], lang = "en" } = req.body as {
        message?: string;
        history?: ChatTurn[];
        lang?: "en" | "ar";
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: "Message is required." });
        return;
      }

      const ai = getAiClient();

      const unifiedCapabilityRules =
        "Automatically adapt to whatever the user asks in a single seamless conversation: give direct, clear, helpful answers for everyday questions; imaginative, expressive storytelling for creative requests; and clean, practical, production-grade code with concise explanations for programming questions.";

      const arabicStyleRules = [
        "ARABIC CONVERSATION STYLE: When responding in Arabic, ALWAYS speak in natural, warm, friendly, everyday casual Arabic—just like a helpful friend or ChatGPT's natural conversational tone.",
        "NEVER use stiff, robotic, or overly formal Modern Standard Arabic (الفصحى الرسمية المتكلفة).",
        "Understand all Arabic dialects (Gulf/Khaleeji, Saudi, Egyptian, Levantine, Iraqi, Maghrebi, etc.) and naturally match and reply in the user's exact dialect whenever they use one. If their dialect isn't obvious, use light, natural, friendly everyday Arabic.",
        "Keep answers crisp, clear, warm, human-like, and easy to read.",
      ].join(" ");

      const languageHint =
        lang === "ar"
          ? "The app interface is in Arabic. Reply in natural casual Arabic matching the user's dialect unless they specifically write in English."
          : "Match the user's language naturally (English or casual Arabic matching their dialect).";

      const systemInstruction = [
        "You are NOVA AI, a friendly, fast, natural bilingual assistant (Arabic & English).",
        "CRITICAL IDENTITY RULE: When anyone asks who created this app, who made you, or who your developer is (in English, Arabic, or any language), you MUST always answer:",
        'In English: "I was created by Ahmed. My developer is Ahmed."',
        'In Arabic: answer warmly in casual Arabic that Ahmed created and developed you (for example: "أحمد هو اللي أنشأني، مطوري هو أحمد.") and keep the meaning exact.',
        "STRICT PROHIBITION: NEVER mention Gemini, Google, Alphabet, or any other company or organization as the creator, builder, or developer of this app or of yourself.",
        unifiedCapabilityRules,
        arabicStyleRules,
        languageHint,
      ].join(" ");

      const contents = [
        ...history
          .filter((item) => item && typeof item.text === "string" && item.text.trim().length > 0)
          .slice(-12)
          .map((item) => ({
            role: item.role === "model" ? "model" : "user",
            parts: [{ text: item.text }],
          })),
        {
          role: "user",
          parts: [{ text: message.trim() }],
        },
      ];

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const stream = await ai.models.generateContentStream({
        model: MODEL_ID,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("Chat stream error:", err);
      const parsed = getReadableError(err);
      if (!res.headersSent) {
        res.status(parsed.status).json({ error: parsed.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: parsed.message })}\n\n`);
        res.end();
      }
    }
  });

  // Audio Transcription fallback using gemini-3.5-transcribe (Arabic & English)
  app.post("/api/transcribe", async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType = "audio/webm", lang = "ar" } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        lang?: "en" | "ar";
      };

      if (!audioBase64 || typeof audioBase64 !== "string") {
        res.status(400).json({ error: "Audio payload is required." });
        return;
      }

      const ai = getAiClient();
      const promptText =
        lang === "ar"
          ? "Transcribe the spoken speech accurately in its original language (Arabic or English). Return only the clean transcribed text without extra commentary."
          : "Transcribe the spoken speech accurately in its original language (English or Arabic). Return only the clean transcribed text without extra commentary.";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: promptText },
          ],
        },
      });

      const transcript = (response.text || "").trim();
      res.json({ text: transcript });
    } catch (err) {
      console.error("Transcription error:", err);
      const parsed = getReadableError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NOVA AI chat server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start NOVA AI server:", err);
  process.exit(1);
});
