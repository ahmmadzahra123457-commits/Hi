import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Plus,
  History,
  X,
  Square,
  Copy,
  Check,
  Eraser,
  Mic,
  Loader2,
  Globe,
} from "lucide-react";
import type { TranslationCopy } from "../i18n";
import type {
  ChatMessage,
  ChatThread,
  Language,
  UserSettingsData,
} from "../types";
import { generateConversationTitle } from "../utils/chatStorage";
import { playSubtleSound, triggerHapticFeedback } from "../utils/mediaAndAudio";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { MessageContent } from "./MessageContent";
import { HistoryList } from "./HistoryList";
import { NovaLogo } from "./NovaLogo";

interface ChatViewProps {
  t: TranslationCopy;
  lang: Language;
  threads: ChatThread[];
  activeThreadId: string;
  settings: UserSettingsData;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  onRenameThread: (id: string, title: string) => void;
  onDeleteThread: (id: string) => void;
  onClearThread: (id: string) => void;
  onUpdateThread: (thread: ChatThread) => void;
  onPersistMessage?: (thread: ChatThread, message: ChatMessage) => void;
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1.5" role="status" aria-label={label}>
      {[0, 1, 2].map((idx) => (
        <motion.span
          key={idx}
          className="h-2 w-2 rounded-full bg-[var(--nova-text-muted)]"
          animate={{ opacity: [0.28, 1, 0.28], y: [0, -3, 0] }}
          transition={{
            duration: 0.75,
            repeat: Infinity,
            delay: idx * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function formatDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ChatView({
  t,
  lang,
  threads,
  activeThreadId,
  settings,
  onSelectThread,
  onCreateThread,
  onRenameThread,
  onDeleteThread,
  onClearThread,
  onUpdateThread,
  onPersistMessage,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const targetTextRef = useRef("");
  const displayedLengthRef = useRef(0);
  const streamDoneRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const activeStreamThreadRef = useRef<ChatThread | null>(null);
  const activeStreamMsgIdRef = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const activeThread = threads.find((th) => th.id === activeThreadId) || threads[0];

  const voice = useVoiceInput({
    appLang: lang,
    currentText: input,
    hapticsEnabled: settings.hapticsEnabled,
    onTextUpdate: setInput,
    onError: setErrorMsg,
    messages: {
      permissionDenied: t.chat.voice.permissionDenied,
      unavailable: t.chat.voice.unavailable,
      noSpeechDetected: t.chat.voice.noSpeechDetected,
    },
  });

  // Auto-expand textarea height cleanly as user types or dictates longer messages
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, 176);
    el.style.height = `${Math.max(44, nextHeight)}px`;
  }, [input]);

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAnimationLoop();
      abortRef.current?.abort();
    };
  }, [stopAnimationLoop]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
  }, [activeThread?.messages.length, streamingText, isStreaming]);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Clipboard unavailable
    }
  };

  const finalizeStream = useCallback(
    (finalText: string, shouldFeedback: boolean) => {
      stopAnimationLoop();
      const targetThread = activeStreamThreadRef.current;
      const msgId = activeStreamMsgIdRef.current;
      const currentSettings = settingsRef.current;

      if (targetThread && msgId) {
        const finalizedThread: ChatThread = {
          ...targetThread,
          isPersisted:
            currentSettings.autoSaveHistory &&
            (targetThread.isPersisted || Boolean(finalText)),
          messages: finalText
            ? targetThread.messages.map((m) =>
                m.id === msgId ? { ...m, text: finalText } : m
              )
            : targetThread.messages.filter((m) => m.id !== msgId),
          updatedAt: Date.now(),
        };
        onUpdateThread(finalizedThread);

        if (currentSettings.autoSaveHistory && finalText.trim().length > 0) {
          const finalMsg = finalizedThread.messages.find((m) => m.id === msgId);
          if (finalMsg) {
            onPersistMessage?.(finalizedThread, finalMsg);
          }
        }
      }

      activeStreamThreadRef.current = null;
      activeStreamMsgIdRef.current = null;
      setStreamingMsgId(null);
      setStreamingText("");
      setIsStreaming(false);

      if (shouldFeedback && finalText.trim().length > 0) {
        triggerHapticFeedback(currentSettings.hapticsEnabled, 22);
        if (currentSettings.soundEnabled) {
          playSubtleSound("complete");
        }
      }
    },
    [onPersistMessage, onUpdateThread, stopAnimationLoop]
  );

  const startRevealLoop = useCallback(() => {
    if (settingsRef.current.typingSpeed === "instant") {
      displayedLengthRef.current = targetTextRef.current.length;
      setStreamingText(targetTextRef.current);
      if (streamDoneRef.current) {
        finalizeStream(targetTextRef.current, true);
      }
      return;
    }

    if (rafRef.current !== null) return;

    const tick = () => {
      const full = targetTextRef.current;
      const currentLen = displayedLengthRef.current;
      const backlog = full.length - currentLen;
      const isNatural = settingsRef.current.typingSpeed === "natural";

      if (backlog > 0) {
        let step = isNatural ? 2 : 3;
        if (backlog > 180) {
          step = Math.ceil(backlog * (isNatural ? 0.22 : 0.35));
        } else if (backlog > 60) {
          step = Math.ceil(backlog * (isNatural ? 0.16 : 0.25));
        } else if (backlog > 20) {
          step = isNatural ? 3 : 5;
        }

        let nextLen = Math.min(full.length, currentLen + step);

        if (nextLen < full.length && backlog <= 80) {
          const nextSpace = full.indexOf(" ", nextLen);
          if (nextSpace !== -1 && nextSpace - nextLen <= 5) {
            nextLen = nextSpace + 1;
          }
        }

        displayedLengthRef.current = nextLen;
        setStreamingText(full.slice(0, nextLen));
      }

      if (streamDoneRef.current && displayedLengthRef.current >= targetTextRef.current.length) {
        finalizeStream(targetTextRef.current, true);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [finalizeStream]);

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    const partial =
      targetTextRef.current.slice(0, displayedLengthRef.current) || targetTextRef.current;
    finalizeStream(partial, false);
  };

  const sendMessage = async (overrideText?: string) => {
    if (voice.status === "recording") {
      await voice.stopRecording();
    }
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming || !activeThread) return;

    triggerHapticFeedback(settings.hapticsEnabled, 12);
    setErrorMsg(null);
    if (!overrideText) setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      createdAt: Date.now(),
    };
    const modelMsgId = `m-${Date.now() + 1}`;
    const placeholderModelMsg: ChatMessage = {
      id: modelMsgId,
      role: "model",
      text: "",
      createdAt: Date.now() + 1,
    };

    const shouldAutoTitle = !activeThread.customTitle && activeThread.messages.length === 0;
    const nextTitle = shouldAutoTitle
      ? generateConversationTitle(text)
      : activeThread.title;

    const historyForApi = activeThread.messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const threadWithPlaceholder: ChatThread = {
      ...activeThread,
      title: nextTitle,
      isPersisted: settings.autoSaveHistory ? true : activeThread.isPersisted,
      messages: [...activeThread.messages, userMsg, placeholderModelMsg],
      updatedAt: Date.now(),
    };

    onUpdateThread(threadWithPlaceholder);
    if (settings.autoSaveHistory) {
      onPersistMessage?.(threadWithPlaceholder, userMsg);
    }

    targetTextRef.current = "";
    displayedLengthRef.current = 0;
    streamDoneRef.current = false;
    activeStreamThreadRef.current = threadWithPlaceholder;
    activeStreamMsgIdRef.current = modelMsgId;

    setStreamingMsgId(modelMsgId);
    setStreamingText("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyForApi,
          lang,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed." }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming response unavailable.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              targetTextRef.current += parsed.text;
              startRevealLoop();
            }
          } catch (e) {
            if (e instanceof Error && !e.message.includes("JSON")) {
              throw e;
            }
          }
        }
      }

      streamDoneRef.current = true;
      if (targetTextRef.current.length === 0) {
        finalizeStream("", false);
      } else {
        startRevealLoop();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMsg(err instanceof Error ? err.message : "Failed to generate reply.");
        finalizeStream("", false);
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleNewChatClick = () => {
    onCreateThread();
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const isCompact = settings.chatDensity === "compact";
  const userFontClass =
    settings.fontSize === "sm"
      ? "text-[14px]"
      : settings.fontSize === "lg"
      ? "text-[16px]"
      : "text-[15px]";

  const canSend = input.trim().length > 0 && voice.status !== "transcribing";

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-1 gap-5 bg-[var(--nova-bg)] px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
      {/* Desktop Chat History Sidebar */}
      <aside className="hidden lg:flex lg:w-76 lg:shrink-0 lg:flex-col lg:rounded-2xl lg:border lg:border-[var(--nova-border)] lg:bg-[var(--nova-surface)] lg:p-4">
        <button
          type="button"
          onClick={handleNewChatClick}
          disabled={isStreaming}
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--nova-accent-fg)] transition-transform duration-150 hover:bg-[var(--nova-accent-hover)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{t.chat.newChat}</span>
        </button>

        <div className="mt-5 mb-2.5 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-[var(--nova-text-muted)]">
            {t.chat.historyTitle}
          </p>
          <span className="text-[11px] text-[var(--nova-text-muted)] tabular-nums">
            {threads.filter((th) => th.isPersisted || th.messages.length > 0).length}
          </span>
        </div>

        <HistoryList
          t={t}
          threads={threads}
          activeThreadId={activeThread?.id || ""}
          isStreaming={isStreaming}
          hidePreviews={settings.hidePreviews}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={onSelectThread}
          onRename={onRenameThread}
          onDelete={onDeleteThread}
        />
      </aside>

      {/* Main Chat Panel */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface)]">
        {/* Clean Chat Sub-Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                aria-label={t.chat.historyTitle}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={isStreaming}
                onClick={handleNewChatClick}
                aria-label={t.chat.newChat}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] disabled:opacity-45 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="truncate text-sm font-medium text-[var(--nova-text)]">
              {settings.hidePreviews && activeThread?.messages.length
                ? t.chat.previewHidden
                : activeThread?.title || t.chat.defaultThreadTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isStreaming}
              onClick={handleNewChatClick}
              className="hidden sm:inline-flex lg:hidden min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3 py-1.5 text-xs font-medium text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] disabled:opacity-45 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t.chat.newChat}</span>
            </button>

            {activeThread && activeThread.messages.length > 0 && (
              <button
                type="button"
                onClick={() => onClearThread(activeThread.id)}
                disabled={isStreaming}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3 py-1.5 text-xs font-medium text-[var(--nova-text-muted)] transition-colors hover:border-rose-500/45 hover:text-rose-500 dark:hover:text-rose-300 disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>{t.chat.clearChat}</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Messages Viewport */}
        <div
          className={`flex-1 overflow-y-auto bg-[var(--nova-surface)] px-4 sm:px-8 ${
            isCompact ? "space-y-3 py-4" : "space-y-5 py-6"
          }`}
        >
          {activeThread && activeThread.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center space-y-7 text-center"
            >
              <div className="flex flex-col items-center space-y-3">
                <NovaLogo size={52} />
                {lang !== "ar" && (
                  <p
                    dir="rtl"
                    className="font-display text-base font-semibold tracking-tight text-[var(--nova-text-muted)]"
                  >
                    {t.chat.welcomeArabicTag}
                  </p>
                )}
                <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--nova-text)] [text-wrap:balance] sm:text-3xl">
                  {t.chat.welcomeHeadline}
                </h1>
                <p className="mx-auto max-w-lg text-sm leading-relaxed text-[var(--nova-text-muted)] sm:text-[15px]">
                  {t.chat.welcomeDesc}
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {t.chat.starters.map((starter, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void sendMessage(starter)}
                    className="min-h-[56px] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] px-4 py-3.5 text-start text-sm leading-snug text-[var(--nova-text)] transition-all duration-150 hover:border-[var(--nova-border-strong)] hover:bg-[var(--nova-accent-soft)] active:scale-[0.98] cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className={`mx-auto max-w-3xl ${isCompact ? "space-y-3" : "space-y-5"}`}>
              {activeThread?.messages.map((msg) => {
                const isUser = msg.role === "user";
                const isActiveStreamMsg = msg.id === streamingMsgId;
                const displayText = isActiveStreamMsg ? streamingText : msg.text;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl sm:max-w-[80%] ${
                        isCompact ? "px-3.5 py-2.5" : "px-4 py-3 sm:px-5 sm:py-3.5"
                      } ${
                        isUser
                          ? "bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                          : "border border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)]"
                      }`}
                    >
                      {isUser ? (
                        <p className={`whitespace-pre-wrap font-medium leading-relaxed ${userFontClass}`}>
                          {displayText}
                        </p>
                      ) : displayText ? (
                        <div className="space-y-2">
                          <MessageContent
                            text={displayText}
                            copyLabel={t.chat.copy}
                            copiedLabel={t.chat.copied}
                            fontSize={settings.fontSize}
                          />
                          {isActiveStreamMsg ? (
                            <span
                              className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[var(--nova-text)] opacity-80 align-middle"
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => void handleCopyMessage(msg.id, displayText)}
                                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-[var(--nova-text-muted)] transition-colors hover:bg-[var(--nova-accent-soft)] hover:text-[var(--nova-text)] cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                <span>{copiedId === msg.id ? t.chat.copied : t.chat.copy}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <TypingIndicator label={t.chat.thinking} />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-[var(--nova-surface-subtle)] px-4 py-2.5 text-xs text-rose-500 dark:text-rose-300 sm:mx-6">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="font-medium underline shrink-0 cursor-pointer"
            >
              {t.chat.dismiss}
            </button>
          </div>
        )}

        {/* Integrated Writing Interface with Microphone & Checkmark Send Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="bg-[var(--nova-surface)] px-3 pb-3 pt-2 pb-safe sm:px-6 sm:pb-5"
        >
          <div className="mx-auto max-w-3xl rounded-[26px] border border-[var(--nova-border-strong)] bg-[var(--nova-surface-subtle)] p-2 transition-colors focus-within:border-[var(--nova-text)]/45">
            {/* Live Voice Recording Waveform & Controls Bar */}
            <AnimatePresence initial={false}>
              {voice.status !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-2 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 py-2.5"
                >
                  {voice.status === "transcribing" ? (
                    <div className="flex w-full items-center justify-center gap-2.5 py-1 text-xs font-medium text-[var(--nova-text)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t.chat.voice.transcribing}</span>
                    </div>
                  ) : (
                    <>
                      {/* Status & Timer */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                        </span>
                        <span className="text-xs font-semibold text-[var(--nova-text)]">
                          {t.chat.voice.listening}
                        </span>
                        <span className="font-mono text-xs text-[var(--nova-text-muted)] tabular-nums">
                          {formatDuration(voice.elapsedSec)}
                        </span>
                      </div>

                      {/* Real-time Audio Waveform */}
                      <div
                        className="flex h-7 flex-1 items-center justify-center gap-[3px] px-2 min-w-[110px]"
                        aria-hidden="true"
                      >
                        {voice.levels.map((level, idx) => (
                          <span
                            key={idx}
                            style={{ transform: `scaleY(${level})` }}
                            className="h-6 w-[3px] origin-center rounded-full bg-[var(--nova-text)] transition-transform duration-75 will-change-transform"
                          />
                        ))}
                      </div>

                      {/* Voice Language Toggle + Cancel / Done Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={voice.toggleVoiceLang}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] px-2.5 text-[11px] font-semibold text-[var(--nova-text)] transition-colors hover:border-[var(--nova-border-strong)] cursor-pointer"
                          title={
                            voice.voiceLang === "ar"
                              ? t.chat.voice.langAr
                              : t.chat.voice.langEn
                          }
                        >
                          <Globe className="h-3 w-3 text-[var(--nova-text-muted)]" />
                          <span>
                            {voice.voiceLang === "ar"
                              ? t.chat.voice.switchToArabic
                              : t.chat.voice.switchToEnglish}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={voice.cancelRecording}
                          aria-label={t.chat.voice.cancel}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-[var(--nova-border)] px-3 text-xs font-medium text-[var(--nova-text-muted)] transition-colors hover:border-rose-500/45 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t.chat.voice.cancel}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void voice.stopRecording()}
                          aria-label={t.chat.voice.stopAndUse}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-[var(--nova-accent)] px-3.5 text-xs font-semibold text-[var(--nova-accent-fg)] transition-transform hover:bg-[var(--nova-accent-hover)] active:scale-95 cursor-pointer"
                        >
                          <Square className="h-3 w-3 fill-current" />
                          <span>{t.chat.voice.stopAndUse}</span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanding Textarea + Inside Microphone & Circular Checkmark Send Button */}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                dir="auto"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={t.chat.placeholder}
                className="max-h-44 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-[var(--nova-text)] placeholder:text-[var(--nova-text-muted)] focus:outline-none"
              />

              <div className="flex items-center gap-1.5 pb-0.5 pe-0.5 shrink-0">
                {/* Professional Microphone Button inside Writing Area */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  disabled={isStreaming || voice.status === "transcribing"}
                  onClick={() => {
                    if (voice.status === "recording") {
                      void voice.stopRecording();
                    } else {
                      setErrorMsg(null);
                      void voice.startRecording();
                    }
                  }}
                  aria-label={
                    voice.status === "recording"
                      ? t.chat.voice.stopAndUse
                      : t.chat.voice.micLabel
                  }
                  className={`relative flex h-[42px] w-[42px] items-center justify-center rounded-full border transition-all duration-150 cursor-pointer disabled:opacity-40 ${
                    voice.status === "recording"
                      ? "border-rose-500/60 bg-rose-500/15 text-rose-400"
                      : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)] hover:border-[var(--nova-border-strong)] hover:bg-[var(--nova-accent-soft)]"
                  }`}
                >
                  {voice.status === "recording" && (
                    <span className="pointer-events-none absolute inset-0 animate-ping rounded-full border border-rose-500/50" />
                  )}
                  <Mic className="h-[18px] w-[18px]" />
                </motion.button>

                {/* Circular Checkmark Send Button (or Stop while streaming) */}
                {isStreaming ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={handleStop}
                    aria-label={t.chat.stop}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="submit"
                    whileTap={canSend ? { scale: 0.88 } : undefined}
                    animate={canSend ? { scale: 1 } : { scale: 0.96 }}
                    transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    disabled={!canSend}
                    aria-label={t.chat.send}
                    className={`flex h-[42px] w-[42px] items-center justify-center rounded-full transition-colors duration-150 cursor-pointer ${
                      canSend
                        ? "bg-[var(--nova-accent)] text-[var(--nova-accent-fg)] hover:bg-[var(--nova-accent-hover)]"
                        : "border border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-muted)] opacity-50 cursor-default"
                    }`}
                  >
                    <Check className="h-[19px] w-[19px]" strokeWidth={2.75} />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* Mobile Chat History Bottom Sheet */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="flex max-h-[82dvh] w-full flex-col rounded-t-3xl border-t border-[var(--nova-border)] bg-[var(--nova-surface)] p-5 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-[var(--nova-border-strong)]" />
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[var(--nova-text)]">
                {t.chat.historyTitle}
              </h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--nova-text-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              disabled={isStreaming}
              onClick={() => {
                handleNewChatClick();
                setHistoryOpen(false);
              }}
              className="mb-4 inline-flex min-h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] text-sm font-semibold text-[var(--nova-accent-fg)] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{t.chat.newChat}</span>
            </button>

            <HistoryList
              t={t}
              threads={threads}
              activeThreadId={activeThread?.id || ""}
              isStreaming={isStreaming}
              hidePreviews={settings.hidePreviews}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={(id) => {
                onSelectThread(id);
                setHistoryOpen(false);
              }}
              onRename={onRenameThread}
              onDelete={onDeleteThread}
            />
          </div>
        </div>
      )}
    </div>
  );
}
