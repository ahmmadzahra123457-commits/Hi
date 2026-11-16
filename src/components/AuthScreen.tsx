import { useState, useRef } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { TranslationCopy } from "../i18n";
import {
  appleProvider,
  auth,
  createUserWithEmailAndPassword,
  googleProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "../firebase";
import { NovaLogo } from "./NovaLogo";

interface AuthScreenProps {
  t: TranslationCopy;
  onContinueLocalGuest: () => void;
}

type AuthPanelMode = "options" | "email";
type EmailTabMode = "signin" | "signup";

function AppleIcon() {
  return (
    <svg
      className="h-[18px] w-[18px] shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.31h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.65z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.96H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.18 7.18 0 0 1 0-4.56V6.62H1.28a12 12 0 0 0 0 10.76l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1C6.23 6.87 8.88 4.76 12 4.76z"
      />
    </svg>
  );
}

export function AuthScreen({ t, onContinueLocalGuest }: AuthScreenProps) {
  const [panelMode, setPanelMode] = useState<AuthPanelMode>("options");
  const [emailTab, setEmailTab] = useState<EmailTabMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const lastActionRef = useRef<(() => Promise<void>) | null>(null);

  const isBusy = busyProvider !== null;

  const handleAppleSignIn = async () => {
    if (isBusy) return;
    lastActionRef.current = handleAppleSignIn;
    setErrorMsg(null);
    setCanRetry(false);
    setBusyProvider("apple");
    try {
      await signInWithPopup(auth, appleProvider);
    } catch {
      setErrorMsg(t.auth.loginError);
      setCanRetry(true);
    } finally {
      setBusyProvider(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isBusy) return;
    lastActionRef.current = handleGoogleSignIn;
    setErrorMsg(null);
    setCanRetry(false);
    setBusyProvider("google");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setErrorMsg(t.auth.loginError);
      setCanRetry(true);
    } finally {
      setBusyProvider(null);
    }
  };

  const handleGuestSignIn = async () => {
    if (isBusy) return;
    lastActionRef.current = handleGuestSignIn;
    setErrorMsg(null);
    setCanRetry(false);
    setBusyProvider("guest");
    try {
      await signInAnonymously(auth);
    } catch {
      onContinueLocalGuest();
    } finally {
      setBusyProvider(null);
    }
  };

  const submitEmailAuth = async () => {
    if (isBusy) return;
    lastActionRef.current = submitEmailAuth;
    setErrorMsg(null);
    setCanRetry(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMsg(t.auth.errors.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setErrorMsg(t.auth.errors.shortPassword);
      return;
    }
    if (emailTab === "signup" && !fullName.trim()) {
      setErrorMsg(t.auth.errors.missingName);
      return;
    }

    setBusyProvider("email");
    try {
      if (emailTab === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        if (fullName.trim()) {
          await updateProfile(cred.user, {
            displayName: fullName.trim().slice(0, 100),
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch {
      setErrorMsg(t.auth.loginError);
      setCanRetry(true);
    } finally {
      setBusyProvider(null);
    }
  };

  const handleRetry = () => {
    if (isBusy) return;
    if (lastActionRef.current) {
      void lastActionRef.current();
    } else {
      setErrorMsg(null);
      setCanRetry(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[var(--nova-bg)] text-[var(--nova-text)]">
      {/* Minimal Top Bar */}
      <header className="flex shrink-0 items-center justify-between px-4 py-4 pt-safe sm:px-8">
        <div className="flex items-center gap-2.5">
          <NovaLogo size={32} />
          <span className="font-display text-base font-bold tracking-tight text-[var(--nova-text)]">
            {t.brand}
          </span>
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 pb-safe">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[430px] rounded-3xl border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 sm:p-8"
        >
          <div className="flex flex-col items-center text-center">
            <NovaLogo size={54} className="mb-4" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--nova-text)] [text-wrap:balance] sm:text-[26px]">
              {t.auth.headline}
            </h1>
            <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-[var(--nova-text-muted)]">
              {t.auth.subtitle}
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-5 flex flex-col gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/[0.06] px-4 py-3 text-xs leading-relaxed text-rose-500 dark:text-rose-300"
            >
              <span className="font-medium">{errorMsg}</span>
              {canRetry && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleRetry}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rose-500/40 bg-[var(--nova-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t.auth.retry}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={onContinueLocalGuest}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3 py-1.5 text-xs font-medium text-[var(--nova-text-muted)] transition-colors hover:text-[var(--nova-text)] cursor-pointer"
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    <span>{t.auth.continueGuest}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {panelMode === "options" ? (
            <div className="mt-7 space-y-3">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleAppleSignIn()}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-[var(--nova-accent)] px-4 py-3 text-sm font-semibold text-[var(--nova-accent-fg)] transition-all duration-150 hover:bg-[var(--nova-accent-hover)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {busyProvider === "apple" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AppleIcon />
                )}
                <span>{t.auth.continueApple}</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleGoogleSignIn()}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-4 py-3 text-sm font-semibold text-[var(--nova-text)] transition-all duration-150 hover:bg-[var(--nova-accent-soft)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {busyProvider === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{t.auth.continueGoogle}</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setErrorMsg(null);
                  setCanRetry(false);
                  setPanelMode("email");
                }}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-4 py-3 text-sm font-semibold text-[var(--nova-text)] transition-all duration-150 hover:bg-[var(--nova-accent-soft)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <Mail className="h-[18px] w-[18px] text-[var(--nova-text-muted)]" />
                <span>{t.auth.continueEmail}</span>
              </button>

              <div className="flex items-center gap-3 py-1.5">
                <span className="h-px flex-1 bg-[var(--nova-border)]" />
                <span className="text-xs text-[var(--nova-text-muted)]">
                  {t.auth.orDivider}
                </span>
                <span className="h-px flex-1 bg-[var(--nova-border)]" />
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleGuestSignIn()}
                className="flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-4 py-2.5 text-sm font-medium text-[var(--nova-text-muted)] transition-colors hover:border-[var(--nova-border-strong)] hover:bg-[var(--nova-accent-soft)] hover:text-[var(--nova-text)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {busyProvider === "guest" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
                <span>{t.auth.continueGuest}</span>
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setErrorMsg(null);
                  setCanRetry(false);
                  setPanelMode("options");
                }}
                className="mb-4 inline-flex min-h-[38px] items-center gap-1.5 text-xs font-medium text-[var(--nova-text-muted)] transition-colors hover:text-[var(--nova-text)] cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>{t.auth.backToOptions}</span>
              </button>

              <div className="mb-5 grid grid-cols-2 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setCanRetry(false);
                    setEmailTab("signin");
                  }}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    emailTab === "signin"
                      ? "bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                      : "text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
                  }`}
                >
                  {t.auth.signInTab}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setCanRetry(false);
                    setEmailTab("signup");
                  }}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    emailTab === "signup"
                      ? "bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                      : "text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
                  }`}
                >
                  {t.auth.signUpTab}
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitEmailAuth();
                }}
                className="space-y-3.5"
              >
                {emailTab === "signup" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--nova-text-muted)]">
                      {t.auth.nameLabel}
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t.auth.namePlaceholder}
                      className="min-h-[46px] w-full rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 text-sm text-[var(--nova-text)] placeholder:text-[var(--nova-text-muted)] focus:border-[var(--nova-border-strong)] focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--nova-text-muted)]">
                    {t.auth.emailLabel}
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="min-h-[46px] w-full rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 text-sm text-[var(--nova-text)] placeholder:text-[var(--nova-text-muted)] focus:border-[var(--nova-border-strong)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--nova-text-muted)]">
                    {t.auth.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        emailTab === "signup" ? "new-password" : "current-password"
                      }
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.auth.passwordPlaceholder}
                      className="min-h-[46px] w-full rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] ps-3.5 pe-11 text-sm text-[var(--nova-text)] placeholder:text-[var(--nova-text-muted)] focus:border-[var(--nova-border-strong)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--nova-text-muted)] hover:text-[var(--nova-text)] cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] px-4 py-3 text-sm font-semibold text-[var(--nova-accent-fg)] transition-all duration-150 hover:bg-[var(--nova-accent-hover)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {busyProvider === "email" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span>
                    {emailTab === "signup"
                      ? t.auth.createAccountAction
                      : t.auth.signInAction}
                  </span>
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 flex items-start gap-2 border-t border-[var(--nova-border)] pt-4 text-[11px] leading-relaxed text-[var(--nova-text-muted)]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t.auth.privacyNote}</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
