import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../types";
import { triggerHapticFeedback } from "../utils/mediaAndAudio";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function pickSupportedRecorderMime(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read audio recording."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export type VoiceStatus = "idle" | "recording" | "transcribing";

interface UseVoiceInputOptions {
  appLang: Language;
  currentText: string;
  hapticsEnabled: boolean;
  onTextUpdate: (nextText: string) => void;
  onError: (message: string) => void;
  messages: {
    permissionDenied: string;
    unavailable: string;
    noSpeechDetected: string;
  };
}

const BAR_COUNT = 20;
const INITIAL_BARS = Array.from({ length: BAR_COUNT }, () => 0.14);

export function useVoiceInput({
  appLang,
  currentText,
  hapticsEnabled,
  onTextUpdate,
  onError,
  messages,
}: UseVoiceInputOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [voiceLang, setVoiceLang] = useState<Language>(appLang);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [levels, setLevels] = useState<number[]>(INITIAL_BARS);

  const statusRef = useRef<VoiceStatus>("idle");
  statusRef.current = status;
  const voiceLangRef = useRef<Language>(voiceLang);
  voiceLangRef.current = voiceLang;

  const baseTextRef = useRef("");
  const finalTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const cancelledRef = useRef(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderMimeRef = useRef<string>("audio/webm");

  // Sync default speech recognition language when app language changes while idle
  useEffect(() => {
    if (statusRef.current === "idle") {
      setVoiceLang(appLang);
    }
  }, [appLang]);

  const releaseMediaResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      analyserRef.current = null;
      void ctx.close().catch(() => {});
    }
    setLevels(INITIAL_BARS);
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      releaseMediaResources();
    };
  }, [releaseMediaResources]);

  const mergeText = useCallback((base: string, spoken: string): string => {
    const cleanSpoken = spoken.trim();
    if (!cleanSpoken) return base;
    const trimmedBase = base.trimEnd();
    return trimmedBase ? `${trimmedBase} ${cleanSpoken}` : cleanSpoken;
  }, []);

  const launchSpeechRecognition = useCallback(
    (targetLang: Language) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return;

      if (recognitionRef.current) {
        const old = recognitionRef.current;
        recognitionRef.current = null;
        old.onend = null;
        old.onresult = null;
        old.onerror = null;
        try {
          old.stop();
        } catch {
          // ignore
        }
      }

      const rec = new Ctor();
      rec.lang = targetLang === "ar" ? "ar-SA" : "en-US";
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        if (cancelledRef.current) return;
        let interim = "";
        let newlyFinalized = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item?.[0]?.transcript || "";
          if (item?.isFinal) {
            newlyFinalized += `${text} `;
          } else {
            interim += text;
          }
        }

        if (newlyFinalized) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${newlyFinalized}`.trim();
        }

        const combinedSpoken = [finalTranscriptRef.current, interim.trim()]
          .filter(Boolean)
          .join(" ")
          .trim();

        liveTranscriptRef.current = combinedSpoken;
        if (combinedSpoken) {
          onTextUpdate(mergeText(baseTextRef.current, combinedSpoken));
        }
      };

      rec.onerror = (ev) => {
        // Ignore harmless no-speech / aborted errors while MediaRecorder fallback runs
        if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
          onError(messages.permissionDenied);
        }
      };

      rec.onend = () => {
        if (
          !cancelledRef.current &&
          statusRef.current === "recording" &&
          recognitionRef.current === rec
        ) {
          try {
            rec.start();
          } catch {
            // ignore restart race
          }
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        // fallback handled cleanly by MediaRecorder + /api/transcribe
      }
    },
    [mergeText, messages.permissionDenied, onError, onTextUpdate]
  );

  const startRecording = useCallback(async () => {
    if (statusRef.current !== "idle") return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      onError(messages.unavailable);
      return;
    }

    cancelledRef.current = false;
    baseTextRef.current = currentText;
    finalTranscriptRef.current = "";
    liveTranscriptRef.current = "";
    chunksRef.current = [];
    setElapsedSec(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (cancelledRef.current) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }

      streamRef.current = stream;
      triggerHapticFeedback(hapticsEnabled, 18);

      // Live Web Audio Analyser for real-time audio waveform
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        if (audioCtx.state === "suspended") {
          void audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        analyserRef.current = analyser;

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        let lastFrameTime = 0;

        const sampleWaveform = (now: number) => {
          if (statusRef.current !== "recording" || !analyserRef.current) return;
          if (now - lastFrameTime >= 42) {
            lastFrameTime = now;
            analyserRef.current.getByteFrequencyData(freqData);
            const nextBars: number[] = [];
            const usableBins = Math.min(freqData.length, 24);
            for (let i = 0; i < BAR_COUNT; i++) {
              const binIdx = Math.floor((i / BAR_COUNT) * usableBins);
              const val = freqData[binIdx] || 0;
              // Symmetrical center weighting + gentle floor so bars look crisp and organic
              const normalized = Math.max(0.14, Math.min(1, (val / 255) * 1.35 + 0.14));
              nextBars.push(Number(normalized.toFixed(2)));
            }
            setLevels(nextBars);
          }
          rafRef.current = requestAnimationFrame(sampleWaveform);
        };
        rafRef.current = requestAnimationFrame(sampleWaveform);
      }

      // Parallel MediaRecorder capture for guaranteed server-side transcription fallback
      if (typeof MediaRecorder !== "undefined") {
        const mime = pickSupportedRecorderMime();
        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        recorderMimeRef.current = recorder.mimeType || mime || "audio/webm";
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            chunksRef.current.push(ev.data);
          }
        };
        recorderRef.current = recorder;
        recorder.start(250);
      }

      setStatus("recording");
      statusRef.current = "recording";

      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);

      launchSpeechRecognition(voiceLangRef.current);
    } catch (err) {
      releaseMediaResources();
      setStatus("idle");
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        onError(messages.permissionDenied);
      } else {
        onError(messages.unavailable);
      }
    }
  }, [
    currentText,
    hapticsEnabled,
    launchSpeechRecognition,
    messages.permissionDenied,
    messages.unavailable,
    onError,
    releaseMediaResources,
  ]);

  const stopRecording = useCallback(async () => {
    if (statusRef.current !== "recording") return;
    triggerHapticFeedback(hapticsEnabled, 16);

    const recorder = recorderRef.current;
    const stopRecorderPromise =
      recorder && recorder.state !== "inactive"
        ? new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
            try {
              recorder.stop();
            } catch {
              resolve();
            }
          })
        : Promise.resolve();

    // Stop recognition gracefully before releasing mic tracks
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }

    await stopRecorderPromise;
    recorderRef.current = null;
    releaseMediaResources();

    const capturedLive = liveTranscriptRef.current.trim();
    if (capturedLive) {
      onTextUpdate(mergeText(baseTextRef.current, capturedLive));
      setStatus("idle");
      return;
    }

    // Fallback to server-side Gemini audio transcription if Web Speech API produced no text
    const recordedChunks = chunksRef.current;
    chunksRef.current = [];

    if (recordedChunks.length === 0) {
      setStatus("idle");
      onError(messages.noSpeechDetected);
      return;
    }

    const audioBlob = new Blob(recordedChunks, {
      type: recorderMimeRef.current || "audio/webm",
    });

    if (audioBlob.size < 1200) {
      setStatus("idle");
      onError(messages.noSpeechDetected);
      return;
    }

    setStatus("transcribing");
    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const cleanMime = (recorderMimeRef.current || "audio/webm").split(";")[0];
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: cleanMime,
          lang: voiceLangRef.current,
        }),
      });

      if (!res.ok) {
        throw new Error("Transcription failed");
      }

      const data = (await res.json()) as { text?: string };
      const transcript = (data.text || "").trim();
      if (!transcript) {
        onError(messages.noSpeechDetected);
      } else {
        onTextUpdate(mergeText(baseTextRef.current, transcript));
      }
    } catch {
      onError(messages.noSpeechDetected);
    } finally {
      setStatus("idle");
    }
  }, [
    hapticsEnabled,
    mergeText,
    messages.noSpeechDetected,
    onError,
    onTextUpdate,
    releaseMediaResources,
  ]);

  const cancelRecording = useCallback(() => {
    if (statusRef.current === "idle") return;
    cancelledRef.current = true;
    triggerHapticFeedback(hapticsEnabled, 12);

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    chunksRef.current = [];
    releaseMediaResources();
    onTextUpdate(baseTextRef.current);
    setStatus("idle");
  }, [hapticsEnabled, onTextUpdate, releaseMediaResources]);

  const toggleVoiceLang = useCallback(() => {
    const next: Language = voiceLangRef.current === "ar" ? "en" : "ar";
    setVoiceLang(next);
    voiceLangRef.current = next;
    if (statusRef.current === "recording") {
      // Preserve text recognized so far before switching recognition language
      if (liveTranscriptRef.current.trim()) {
        baseTextRef.current = mergeText(baseTextRef.current, liveTranscriptRef.current);
        finalTranscriptRef.current = "";
        liveTranscriptRef.current = "";
      }
      launchSpeechRecognition(next);
    }
  }, [launchSpeechRecognition, mergeText]);

  return {
    status,
    voiceLang,
    elapsedSec,
    levels,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleVoiceLang,
  };
}
