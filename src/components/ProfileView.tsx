import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Camera,
  Check,
  Edit3,
  Loader2,
  Mail,
  RotateCcw,
  Shield,
  Calendar,
  KeyRound,
  X,
} from "lucide-react";
import type { TranslationCopy } from "../i18n";
import type { Language, UserProfileData } from "../types";
import { resizeAvatarImage } from "../utils/mediaAndAudio";
import { UserAvatar } from "./UserAvatar";

interface ProfileViewProps {
  t: TranslationCopy;
  lang: Language;
  profile: UserProfileData;
  isGuest: boolean;
  onUpdateProfile: (updates: { displayName?: string; photoUrl?: string }) => Promise<void>;
}

const AVATAR_PRESETS = [
  { id: "preset:mono", color: "bg-zinc-900 border-white/25" },
  { id: "preset:blue", color: "bg-blue-600 border-blue-400/50" },
  { id: "preset:emerald", color: "bg-emerald-600 border-emerald-400/50" },
  { id: "preset:amber", color: "bg-amber-500 border-amber-300/60" },
  { id: "preset:rose", color: "bg-rose-600 border-rose-400/50" },
  { id: "preset:violet", color: "bg-violet-600 border-violet-400/50" },
];

export function ProfileView({
  t,
  lang,
  profile,
  isGuest,
  onUpdateProfile,
}: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formattedDate = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(profile.createdAt || Date.now()));

  const providerLabel = t.profile.providerLabels[profile.authProvider];
  const accountTypeLabel = isGuest ? t.profile.guestType : t.profile.registeredType;
  const emailDisplay = isGuest
    ? t.auth.guestAccountLabel
    : profile.email || t.auth.personalAccount;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onUpdateProfile({ displayName: trimmed.slice(0, 100) });
      setEditing(false);
      setStatusMsg(t.profile.savedSuccess);
      setTimeout(() => setStatusMsg(null), 2200);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSaving(true);
    try {
      const resized = await resizeAvatarImage(file);
      await onUpdateProfile({ photoUrl: resized });
      setChoosingPhoto(false);
      setStatusMsg(t.profile.savedSuccess);
      setTimeout(() => setStatusMsg(null), 2200);
    } catch {
      // Ignore invalid image error cleanly
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdateProfile({ photoUrl: presetId });
      setStatusMsg(t.profile.savedSuccess);
      setTimeout(() => setStatusMsg(null), 2200);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPhoto = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdateProfile({ photoUrl: "" });
      setChoosingPhoto(false);
      setStatusMsg(t.profile.savedSuccess);
      setTimeout(() => setStatusMsg(null), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--nova-bg)] px-4 py-6 pb-24 sm:px-8 sm:py-8 lg:pb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-3xl space-y-6"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--nova-text)]">
              {t.profile.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--nova-text-muted)]">
              {t.profile.subtitle}
            </p>
          </div>
          {statusMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
              <Check className="h-3.5 w-3.5" />
              <span>{statusMsg}</span>
            </span>
          )}
        </div>

        {/* Profile Hero Section */}
        <section className="rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5 sm:p-7">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <UserAvatar
                name={profile.displayName}
                photoUrl={profile.photoUrl}
                size="xl"
              />
              <div className="min-w-0 space-y-1">
                <h2 className="truncate font-display text-xl font-bold text-[var(--nova-text)]">
                  {profile.displayName}
                </h2>
                <p dir="ltr" className="truncate text-sm text-[var(--nova-text-muted)]">
                  {emailDisplay}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--nova-text-muted)]">
                  <span>{accountTypeLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{providerLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setNameInput(profile.displayName);
                  setEditing((prev) => !prev);
                }}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-4 py-2 text-xs font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] whitespace-nowrap sm:flex-initial cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{t.profile.editProfile}</span>
              </button>

              <button
                type="button"
                onClick={() => setChoosingPhoto((prev) => !prev)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] px-4 py-2 text-xs font-semibold text-[var(--nova-accent-fg)] transition-colors hover:bg-[var(--nova-accent-hover)] whitespace-nowrap sm:flex-initial cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{t.profile.changePhoto}</span>
              </button>
            </div>
          </div>

          {/* Inline Edit Profile Name Panel */}
          {editing && (
            <form
              onSubmit={(e) => void handleSaveName(e)}
              className="mt-6 border-t border-[var(--nova-border)] pt-5"
            >
              <label className="mb-2 block text-xs font-medium text-[var(--nova-text-muted)]">
                {t.profile.displayName}
              </label>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  type="text"
                  maxLength={100}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 text-sm text-[var(--nova-text)] focus:border-[var(--nova-border-strong)] focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving || !nameInput.trim()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] px-5 text-xs font-semibold text-[var(--nova-accent-fg)] transition-colors hover:bg-[var(--nova-accent-hover)] disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>{t.profile.saveChanges}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--nova-border)] px-4 text-xs font-medium text-[var(--nova-text-muted)] hover:text-[var(--nova-text)] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{t.profile.cancel}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Inline Change Profile Picture Panel */}
          {choosingPhoto && (
            <div className="mt-6 space-y-4 border-t border-[var(--nova-border)] pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleFileChange(e)}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--nova-accent)] px-4 py-2 text-xs font-semibold text-[var(--nova-accent-fg)] hover:bg-[var(--nova-accent-hover)] disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>{t.profile.uploadPhotoLabel}</span>
                </button>
                {profile.photoUrl && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleResetPhoto()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--nova-border)] px-4 py-2 text-xs font-medium text-[var(--nova-text-muted)] hover:text-[var(--nova-text)] disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t.profile.removePhoto}</span>
                  </button>
                )}
              </div>

              <div>
                <p className="mb-2.5 text-xs font-medium text-[var(--nova-text-muted)]">
                  {t.profile.presetAvatarsLabel}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {AVATAR_PRESETS.map((preset) => {
                    const selected = profile.photoUrl === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={saving}
                        onClick={() => void handleSelectPreset(preset.id)}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 cursor-pointer ${
                          preset.color
                        } ${
                          selected
                            ? "ring-2 ring-[var(--nova-accent)] ring-offset-2 ring-offset-[var(--nova-bg)]"
                            : ""
                        }`}
                        aria-label={preset.id}
                      >
                        {selected && <Check className="h-4 w-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Account Details Grid */}
        <section className="divide-y divide-[var(--nova-border)] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface)]">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3 text-sm text-[var(--nova-text-muted)]">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{t.profile.emailOrAccount}</span>
            </div>
            <span dir="ltr" className="truncate text-sm font-medium text-[var(--nova-text)]">
              {emailDisplay}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3 text-sm text-[var(--nova-text-muted)]">
              <KeyRound className="h-4 w-4 shrink-0" />
              <span>{t.profile.loginProvider}</span>
            </div>
            <span className="text-sm font-medium text-[var(--nova-text)]">
              {providerLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3 text-sm text-[var(--nova-text-muted)]">
              <Shield className="h-4 w-4 shrink-0" />
              <span>{t.profile.accountType}</span>
            </div>
            <span className="text-sm font-medium text-[var(--nova-text)]">
              {accountTypeLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3 text-sm text-[var(--nova-text-muted)]">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{t.profile.accountCreated}</span>
            </div>
            <span className="text-sm font-medium text-[var(--nova-text)] tabular-nums">
              {formattedDate}
            </span>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
