import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { FontSizeOption } from "../types";

interface MessageContentProps {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  fontSize?: FontSizeOption;
}

function isArabicDominant(input: string): boolean {
  const arabicChars = (input.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (input.match(/[A-Za-z]/g) || []).length;
  return arabicChars > latinChars;
}

function renderInlineFormatting(line: string) {
  const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[var(--nova-text)]">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={idx}
          dir="ltr"
          className="rounded bg-[var(--nova-accent-soft)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--nova-text)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}

function CodeBlock({
  code,
  language,
  copyLabel,
  copiedLabel,
}: {
  code: string;
  language: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div
      dir="ltr"
      className="my-3 overflow-hidden rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--nova-border)] px-3.5 py-2 text-xs text-[var(--nova-text-muted)]">
        <span className="font-mono">{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--nova-text-muted)] transition-colors hover:bg-[var(--nova-accent-soft)] hover:text-[var(--nova-text)] active:scale-[0.98] cursor-pointer"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[var(--nova-text)]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-[var(--nova-text)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const FONT_SIZE_CLASS: Record<FontSizeOption, string> = {
  sm: "text-[14px]",
  md: "text-[15px]",
  lg: "text-[16px]",
};

export function MessageContent({
  text,
  copyLabel,
  copiedLabel,
  fontSize = "md",
}: MessageContentProps) {
  const segments = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-2.5 leading-relaxed text-[var(--nova-text)] ${FONT_SIZE_CLASS[fontSize]}`}>
      {segments.map((segment, segIdx) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const inner = segment.slice(3, -3);
          const firstNewline = inner.indexOf("\n");
          const language = firstNewline !== -1 ? inner.slice(0, firstNewline).trim() : "";
          const code = firstNewline !== -1 ? inner.slice(firstNewline + 1) : inner;
          return (
            <CodeBlock
              key={segIdx}
              code={code.trimEnd()}
              language={language}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          );
        }

        const lines = segment.split("\n");
        return (
          <div key={segIdx} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lineIdx} className="h-1" />;
              }
              const dir = isArabicDominant(trimmed) ? "rtl" : "ltr";

              if (trimmed.startsWith("### ")) {
                return (
                  <h4
                    key={lineIdx}
                    dir={dir}
                    className="pt-1 text-base font-semibold text-[var(--nova-text)]"
                  >
                    {renderInlineFormatting(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
                const content = trimmed.replace(/^#+\s*/, "");
                return (
                  <h3
                    key={lineIdx}
                    dir={dir}
                    className="pt-1.5 text-lg font-semibold text-[var(--nova-text)]"
                  >
                    {renderInlineFormatting(content)}
                  </h3>
                );
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} dir={dir} className="flex gap-2.5">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nova-text-muted)]"
                      aria-hidden="true"
                    />
                    <p className="flex-1">{renderInlineFormatting(trimmed.slice(2))}</p>
                  </div>
                );
              }

              return (
                <p key={lineIdx} dir={dir}>
                  {renderInlineFormatting(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
