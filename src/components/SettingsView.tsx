import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Download,
  EyeOff,
  Globe,
  History,
  Loader2,
  LogOut,
  MessageSquareText,
  Moon,
  Palette,
  Save,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Volume2,
} from "lucide-react";
import type { TranslationCopy } from "../i18n";
import type {
  AccentColor,
  ChatDensity,
  ChatThread,
  FontSizeOption,
  Language,
  TypingSpeedOption,
  UserProfileData,
  UserSettingsData,
} from "../types";
import { resizeAvatarImage } from "../utils/mediaAndAudio";
import { UserAvatar } from "./UserAvatar";

export type SettingsFocusSection =
  | "all"
  | "my-account"
  | "profile"
  | "notifications"
  | "appearance"
  | "language"
  | "privacy"
  | "sound"
  | "chat-preferences"
  | "chat-history";

interface SettingsViewProps {
  t: TranslationCopy;
  profile: UserProfileData;
  settings: UserSettingsData;
  threads: ChatThread[];
  isGuest: boolean;
  initialFocusSection?: SettingsFocusSection;
  onUpdateProfile: (updates: { displayName?: string; photoUrl?: string }) => Promise<void>;
  onUpdateSettings: (patch: Partial<UserSettingsData>) => void;
  onClearAllHistory: () => Promise<void>;
  onOpenNotifications?: () => void;
  onOpenHistory?: () => void;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<{ ok: boolean; needsReauth?: boolean }>;
}

const ACCENT_SWATCHES: Array<{ id: AccentColor; swatchClass: string }> = [
  { id: "mono", swatchClass: "bg-zinc-900 dark:bg-white border border-[var(--nova-border-strong)]" },
  { id: "blue", swatchClass: "bg-blue-600" },
  { id: "emerald", swatchClass: "bg-emerald-600" },
  { id: "amber", swatchClass: "bg-amber-500" },
  { id: "rose", swatchClass: "bg-rose-600" },
  { id: "violet", swatchClass: "bg-violet-600" },
];

function SectionHeading({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof Shield;
  title: string;
  badge?: string | number;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] text-[var(--nova-text)]">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h2 className="font-display text-sm font-semibold tracking-tight text-[var(--nova-text)]">
          {title}
        </h2>
      </div>
      {badge !== undefined && (
        <span className="text-xs font-medium text-[var(--nova-text-muted)] tabular-nums">
          {badge}
        </span>
      )}
    </div>
  );
}

function SettingToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3.5 px-4 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-muted)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--nova-text)]">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--nova-text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
          checked
            ? "border-transparent bg-[var(--nova-accent)]"
            : "border-[var(--nova-border-strong)] bg-[var(--nova-surface)]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform duration-150 ${
            checked
              ? "translate-x-6 rtl:-translate-x-6 bg-[var(--nova-accent-fg)]"
              : "translate-x-1 rtl:-translate-x-1 bg-[var(--nova-text-muted)]"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsView({
  t,
  profile,
  settings,
  threads,
  isGuest,
  initialFocusSection = "all",
  onUpdateProfile,
  onUpdateSettings,
  onClearAllHistory,
  onOpenNotifications,
  onOpenHistory,
  onSignOut,
  onDeleteAccount,
}: SettingsViewProps) {
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [confirmModal, setConfirmModal] = useState<"clearChats" | "deleteAccount" | null>(
    null
  );
  const [busyAction, setBusyAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNameInput(profile.displayName);
  }, [profile.displayName]);

  useEffect(() => {
    if (!initialFocusSection || initialFocusSection === "all") return;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`settings-section-${initialFocusSection}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [initialFocusSection]);

  const savedHistoryCount = threads.filter(
    (th) => th.isPersisted || th.messages.length > 0
  ).length;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || savingProfile) return;
    setSavingProfile(true);
    try {
      await onUpdateProfile({ displayName: trimmed.slice(0, 100) });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 1800);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSavingProfile(true);
    try {
      const dataUrl = await resizeAvatarImage(file);
      await onUpdateProfile({ photoUrl: dataUrl });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 1800);
    } catch {
      // ignore invalid file
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExportChats = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: profile.displayName,
      conversations: threads.filter((th) => th.messages.length > 0),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nova-ai-chats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleConfirmClearAll = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      await onClearAllHistory();
      setConfirmModal(null);
    } finally {
      setBusyAction(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (busyAction) return;
    setBusyAction(true);
    setActionError(null);
    try {
      const res = await onDeleteAccount();
      if (!res.ok) {
        setActionError(
          res.needsReauth ? t.settings.reauthNeededError : t.auth.loginError
        );
      } else {
        setConfirmModal(null);
      }
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--nova-bg)] px-4 py-6 pb-24 sm:px-7 sm:py-7 lg:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--nova-text)]">
              {t.settings.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--nova-text-muted)]">
              {t.settings.subtitle}
            </p>
          </div>
          <span className="text-xs font-medium text-[var(--nova-text-muted)]">
            {t.settings.autoSavedHint}
          </span>
        </div>

        {/* 1. Profile */}
        <section id="settings-section-profile">
          <SectionHeading icon={UserRound} title={t.settings.sections.profile} />
          <div className="rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  name={profile.displayName}
                  photoUrl={profile.photoUrl}
                  size="lg"
                />
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleAvatarUpload(e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{t.settings.changePhoto}</span>
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => void handleSaveName(e)}
                className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"
              >
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--nova-text-muted)]">
                    {t.settings.displayNameLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 text-sm text-[var(--nova-text)] focus:border-[var(--nova-border-strong)] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile || !nameInput.trim()}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--nova-accent)] px-4 text-xs font-semibold text-[var(--nova-accent-fg)] transition-colors hover:bg-[var(--nova-accent-hover)] disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : profileSaved ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                  <span>{t.settings.saveName}</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* 2. Appearance */}
        <section id="settings-section-appearance">
          <SectionHeading icon={Palette} title={t.settings.sections.appearance} />
          <div className="divide-y divide-[var(--nova-border)] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)]">
            <div className="space-y-2.5 p-4 sm:p-5">
              <p className="text-xs font-medium text-[var(--nova-text-muted)]">
                {t.settings.themeLabel}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: "dark" })}
                  className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors cursor-pointer ${
                    settings.theme === "dark"
                      ? "border-transparent bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                      : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)] hover:bg-[var(--nova-accent-soft)]"
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  <span>{t.settings.darkTheme}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: "light" })}
                  className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors cursor-pointer ${
                    settings.theme === "light"
                      ? "border-transparent bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                      : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)] hover:bg-[var(--nova-accent-soft)]"
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  <span>{t.settings.lightTheme}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 p-4 sm:p-5">
              <p className="text-xs font-medium text-[var(--nova-text-muted)]">
                {t.settings.accentColorLabel}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACCENT_SWATCHES.map((item) => {
                  const active = settings.accentColor === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateSettings({ accentColor: item.id })}
                      className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? "border-[var(--nova-border-strong)] bg-[var(--nova-surface)] text-[var(--nova-text)]"
                          : "border-[var(--nova-border)] bg-[var(--nova-surface)]/50 text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
                      }`}
                    >
                      <span className={`h-4 w-4 shrink-0 rounded-full ${item.swatchClass}`} />
                      <span className="truncate">{t.settings.accentNames[item.id]}</span>
                      {active && <Check className="ms-auto h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Language */}
        <section id="settings-section-language">
          <SectionHeading icon={Globe} title={t.settings.sections.language} />
          <div className="rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2.5">
              {(["en", "ar"] as Language[]).map((langOption) => {
                const active = settings.language === langOption;
                return (
                  <button
                    key={langOption}
                    type="button"
                    onClick={() => onUpdateSettings({ language: langOption })}
                    className={`min-h-[46px] rounded-xl border px-3 text-sm font-semibold transition-colors cursor-pointer ${
                      active
                        ? "border-transparent bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                        : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)] hover:bg-[var(--nova-accent-soft)]"
                    }`}
                  >
                    {langOption === "en" ? t.settings.englishLang : t.settings.arabicLang}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Chat Preferences */}
        <section id="settings-section-chat-preferences">
          <SectionHeading
            icon={MessageSquareText}
            title={t.settings.sections.chatPreferences}
          />
          <div className="divide-y divide-[var(--nova-border)] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)]">
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--nova-text-muted)]">
                  {t.settings.chatDensityLabel}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["comfortable", "compact"] as ChatDensity[]).map((density) => (
                    <button
                      key={density}
                      type="button"
                      onClick={() => onUpdateSettings({ chatDensity: density })}
                      className={`min-h-[42px] rounded-xl border px-3 text-xs font-semibold transition-colors cursor-pointer ${
                        settings.chatDensity === density
                          ? "border-transparent bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                          : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
                      }`}
                    >
                      {density === "comfortable" ? t.settings.comfortable : t.settings.compact}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--nova-text-muted)]">
                  {t.settings.fontSizeLabel}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["sm", "md", "lg"] as FontSizeOption[]).map((sizeOpt) => (
                    <button
                      key={sizeOpt}
                      type="button"
                      onClick={() => onUpdateSettings({ fontSize: sizeOpt })}
                      className={`min-h-[42px] rounded-xl border px-2 text-xs font-semibold transition-colors cursor-pointer ${
                        settings.fontSize === sizeOpt
                          ? "border-transparent bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                          : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
                      }`}
                    >
                      {t.settings.fontSizes[sizeOpt]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 sm:p-5">
              <p className="text-xs font-medium text-[var(--nova-text-muted)]">
                {t.settings.typingSpeedLabel}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["fast", "natural", "instant"] as TypingSpeedOption[]).map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => onUpdateSettings({ typingSpeed: speed })}
                    className={`min-h-[42px] rounded-xl border px-3 text-xs font-semibold transition-colors cursor-pointer ${
                      settings.typingSpeed === speed
                        ? "border-transparent bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                        : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
                    }`}
                  >
                    {t.settings.typingSpeeds[speed]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Notifications */}
        <section id="settings-section-notifications">
          <SectionHeading icon={Bell} title={t.settings.sections.notifications} />
          <div className="divide-y divide-[var(--nova-border)] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)]">
            <SettingToggleRow
              icon={Bell}
              label={t.settings.inAppNotifs}
              description={t.settings.inAppNotifsDesc}
              checked={settings.notificationsEnabled}
              onChange={(val) => onUpdateSettings({ notificationsEnabled: val })}
            />
            <SettingToggleRow
              icon={Sparkles}
              label={t.settings.featureNotifs}
              description={t.settings.featureNotifsDesc}
              checked={settings.featureAnnouncements}
              onChange={(val) => onUpdateSettings({ featureAnnouncements: val })}
            />
            <SettingToggleRow
              icon={Shield}
              label={t.settings.accountNotifs}
              description={t.settings.accountNotifsDesc}
              checked={settings.accountAlerts}
              onChange={(val) => onUpdateSettings({ accountAlerts: val })}
            />
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="flex min-h-[52px] w-full items-center justify-between px-4 py-3 text-start text-sm font-medium text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
              >
                <span>{t.settings.openNotifsBtn}</span>
                <ChevronRight className="h-4 w-4 text-[var(--nova-text-muted)] rtl:rotate-180" />
              </button>
            )}
          </div>
        </section>

        {/* 6. Sound and Vibration */}
        <section id="settings-section-sound">
          <SectionHeading icon={Volume2} title={t.settings.sections.soundVibration} />
          <div className="divide-y divide-[var(--nova-border)] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)]">
            <SettingToggleRow
              icon={Smartphone}
              label={t.settings.hapticsLabel}
              description={t.settings.hapticsDesc}
              checked={settings.hapticsEnabled}
              onChange={(val) => onUpdateSettings({ hapticsEnabled: val })}
            />
            <SettingToggleRow
              icon={Volume2}
              label={t.settings.soundLabel}
              description={t.settings.soundDesc}
              checked={settings.soundEnabled}
              onChange={(val) => onUpdateSettings({ soundEnabled: val })}
            />
          </div>
        </section>

        {/* 7. Privacy */}
        <section id="settings-section-privacy">
          <SectionHeading icon={Shield} title={t.settings.sections.privacy} />
          <div className="divide-y divide-[var(--nova-border)] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)]">
            <SettingToggleRow
              icon={Save}
              label={t.settings.autoSaveLabel}
              description={t.settings.autoSaveDesc}
              checked={settings.autoSaveHistory}
              onChange={(val) => onUpdateSettings({ autoSaveHistory: val })}
            />
            <SettingToggleRow
              icon={EyeOff}
              label={t.settings.hidePreviewsLabel}
              description={t.settings.hidePreviewsDesc}
              checked={settings.hidePreviews}
              onChange={(val) => onUpdateSettings({ hidePreviews: val })}
            />
            <div className="p-4">
              <button
                type="button"
                onClick={handleExportChats}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-4 py-2 text-xs font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{t.settings.exportHistory}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 8. Chat History */}
        <section id="settings-section-chat-history">
          <SectionHeading
            icon={History}
            title={t.settings.sections.chatHistory}
            badge={savedHistoryCount}
          />
          <div className="divide-y divide-[var(--nova-border)] rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)]">
            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="flex min-h-[54px] w-full items-center justify-between px-4 py-3 text-start text-sm font-medium text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
              >
                <span>{t.settings.openHistoryBtn}</span>
                <div className="flex items-center gap-2 text-xs text-[var(--nova-text-muted)] tabular-nums">
                  <span>{savedHistoryCount}</span>
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </div>
              </button>
            )}
            <div className="p-4">
              <button
                type="button"
                onClick={() => setConfirmModal("clearChats")}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-500/40 bg-[var(--nova-surface)] px-4 py-2 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 dark:text-rose-300 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t.settings.clearAllHistory}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 9. My Account */}
        <section id="settings-section-my-account">
          <SectionHeading icon={BadgeCheck} title={t.settings.sections.myAccount} />
          <div className="space-y-4 rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] p-4 sm:p-5">
            <div className="space-y-1 text-xs text-[var(--nova-text-muted)]">
              <p className="text-sm font-semibold text-[var(--nova-text)]">
                {profile.displayName} ·{" "}
                <span dir="ltr">
                  {isGuest
                    ? t.auth.guestAccountLabel
                    : profile.email || t.auth.personalAccount}
                </span>
              </p>
              <p>
                {isGuest ? t.profile.guestType : t.profile.registeredType} ·{" "}
                {t.profile.providerLabels[profile.authProvider]}
              </p>
              <p>{t.settings.freeForeverNote}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-4 py-2 text-xs font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.settings.signOutBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setConfirmModal("deleteAccount");
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-500/45 bg-[var(--nova-surface)] px-4 py-2 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 dark:text-rose-300 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t.settings.deleteAccountBtn}</span>
              </button>
            </div>
          </div>
        </section>
      </motion.div>

      {/* In-App Confirmation Modal (Clear All Chats / Delete Account) */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => !busyAction && setConfirmModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-[var(--nova-text)]">
                  {confirmModal === "clearChats"
                    ? t.settings.clearAllConfirmTitle
                    : t.settings.deleteAccountTitle}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--nova-text-muted)]">
                  {confirmModal === "clearChats"
                    ? t.settings.clearAllConfirmBody
                    : t.settings.deleteAccountBody}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 dark:text-rose-300">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={busyAction}
                onClick={() => setConfirmModal(null)}
                className="min-h-[42px] rounded-xl border border-[var(--nova-border)] px-4 text-xs font-semibold text-[var(--nova-text-muted)] hover:text-[var(--nova-text)] cursor-pointer"
              >
                {t.settings.cancel}
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() =>
                  void (confirmModal === "clearChats"
                    ? handleConfirmClearAll()
                    : handleConfirmDeleteAccount())
                }
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {busyAction && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {confirmModal === "clearChats"
                    ? t.settings.confirmClear
                    : t.settings.confirmDeleteAccount}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
