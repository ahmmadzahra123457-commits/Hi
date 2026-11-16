import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { TranslationCopy } from "../i18n";
import { NovaLogo } from "./NovaLogo";

interface OnboardingViewProps {
  t: TranslationCopy;
  initialName: string;
  onComplete: (name: string) => Promise<void>;
}

export function OnboardingView({ t, initialName, onComplete }: OnboardingViewProps) {
  const cleanSeed =
    initialName && initialName !== "NOVA User" && initialName !== "Guest"
      ? initialName
      : "";
  const [name, setName] = useState(cleanSeed);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg(t.onboarding.emptyNameError);
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    try {
      await onComplete(trimmed.slice(0, 100));
    } catch {
      setErrorMsg(t.auth.loginError);
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--nova-bg)] text-[var(--nova-text)]">
      <header className="flex shrink-0 items-center justify-between px-4 py-4 pt-safe sm:px-8">
        <div className="flex items-center gap-2.5">
          <NovaLogo size={32} />
          <span className="font-display text-base font-bold tracking-tight text-[var(--nova-text)]">
            {t.brand}
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 pb-safe">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] rounded-3xl border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 sm:p-8"
        >
          <div className="flex flex-col items-center text-center">
            <NovaLogo size={52} className="mb-4" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--nova-text)] [text-wrap:balance]">
              {t.onboarding.title}
            </h1>
            <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-[var(--nova-text-muted)]">
              {t.onboarding.subtitle}
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/[0.06] px-3.5 py-2.5 text-xs text-rose-500 dark:text-rose-300"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--nova-text-muted)]">
                {t.onboarding.nameLabel}
              </label>
              <input
                type="text"
                autoFocus
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.onboarding.namePlaceholder}
                className="min-h-[48px] w-full rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-4 text-sm text-[var(--nova-text)] placeholder:text-[var(--nova-text-muted)] focus:border-[var(--nova-border-strong)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] px-4 py-3 text-sm font-semibold text-[var(--nova-accent-fg)] transition-all duration-150 hover:bg-[var(--nova-accent-hover)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{t.onboarding.continueBtn}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
