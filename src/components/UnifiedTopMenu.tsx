import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ChevronRight,
  Globe,
  History,
  Loader2,
  LogIn,
  LogOut,
  MessageSquareText,
  Palette,
  Plus,
  Settings,
  Shield,
  Trash2,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import type { TranslationCopy } from "../i18n";
import type {
  AppNotification,
  ChatThread,
  Language,
  UserProfileData,
  UserSettingsData,
} from "../types";
import { ProfileView } from "./ProfileView";
import { NotificationsView } from "./NotificationsView";
import { SettingsView, type SettingsFocusSection } from "./SettingsView";
import { HistoryList } from "./HistoryList";
import { UserAvatar } from "./UserAvatar";
import { NovaLogo } from "./NovaLogo";

export type UnifiedMenuSection =
  | "hub"
  | "profile"
  | "notifications"
  | "history"
  | "settings";

interface UnifiedTopMenuProps {
  open: boolean;
  t: TranslationCopy;
  lang: Language;
  profile: UserProfileData;
  settings: UserSettingsData;
  notifications: AppNotification[];
  threads: ChatThread[];
  activeThreadId: string;
  isGuest: boolean;
  onClose: () => void;
  onUpdateProfile: (updates: { displayName?: string; photoUrl?: string }) => Promise<void>;
  onUpdateSettings: (patch: Partial<UserSettingsData>) => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  onRenameThread: (id: string, title: string) => void;
  onDeleteThread: (id: string) => void;
  onClearAllHistory: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onRequestSignIn: () => Promise<void>;
  onDeleteAccount: () => Promise<{ ok: boolean; needsReauth?: boolean }>;
}

export function UnifiedTopMenu({
  open,
  t,
  lang,
  profile,
  settings,
  notifications,
  threads,
  activeThreadId,
  isGuest,
  onClose,
  onUpdateProfile,
  onUpdateSettings,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onSelectThread,
  onCreateThread,
  onRenameThread,
  onDeleteThread,
  onClearAllHistory,
  onSignOut,
  onRequestSignIn,
  onDeleteAccount,
}: UnifiedTopMenuProps) {
  const [section, setSection] = useState<UnifiedMenuSection>("hub");
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocusSection>("all");
  const [historySearch, setHistorySearch] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const savedHistoryCount = threads.filter(
    (th) => th.isPersisted || th.messages.length > 0
  ).length;

  const openSettingsFocused = (focus: SettingsFocusSection) => {
    setSettingsFocus(focus);
    setSection("settings");
  };

  const handleCloseMenu = () => {
    setSection("hub");
    setSettingsFocus("all");
    setConfirmDeleteOpen(false);
    setDeleteError(null);
    onClose();
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await onDeleteAccount();
      if (!res.ok) {
        setDeleteError(
          res.needsReauth ? t.settings.reauthNeededError : t.auth.loginError
        );
      } else {
        handleCloseMenu();
      }
    } finally {
      setDeleting(false);
    }
  };

  const menuRows: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: typeof UserRound;
    badge?: number;
    onClick: () => void;
  }> = [
    {
      id: "profile",
      title: t.menu.profileAndAccount,
      subtitle: t.menu.profileDesc,
      icon: UserRound,
      onClick: () => setSection("profile"),
    },
    {
      id: "notifications",
      title: t.menu.notifications,
      subtitle: t.menu.notificationsDesc,
      icon: Bell,
      badge: unreadCount,
      onClick: () => setSection("notifications"),
    },
    {
      id: "history",
      title: t.menu.chatHistory,
      subtitle: t.menu.chatHistoryDesc,
      icon: History,
      badge: savedHistoryCount,
      onClick: () => setSection("history"),
    },
    {
      id: "appearance",
      title: t.menu.appearance,
      subtitle: t.menu.appearanceDesc,
      icon: Palette,
      onClick: () => openSettingsFocused("appearance"),
    },
    {
      id: "language",
      title: t.menu.language,
      subtitle:
        settings.language === "ar"
          ? t.settings.arabicLang
          : t.settings.englishLang,
      icon: Globe,
      onClick: () => openSettingsFocused("language"),
    },
    {
      id: "chat-preferences",
      title: t.settings.sections.chatPreferences,
      subtitle: t.settings.typingSpeedLabel,
      icon: MessageSquareText,
      onClick: () => openSettingsFocused("chat-preferences"),
    },
    {
      id: "privacy",
      title: t.menu.privacy,
      subtitle: t.menu.privacyDesc,
      icon: Shield,
      onClick: () => openSettingsFocused("privacy"),
    },
    {
      id: "sound",
      title: t.menu.soundVibration,
      subtitle: t.menu.soundVibrationDesc,
      icon: Volume2,
      onClick: () => openSettingsFocused("sound"),
    },
    {
      id: "settings",
      title: t.menu.settings,
      subtitle: t.menu.settingsDesc,
      icon: Settings,
      onClick: () => openSettingsFocused("all"),
    },
  ];

  const sectionHeaderTitle =
    section === "profile"
      ? t.menu.profileAndAccount
      : section === "notifications"
      ? t.menu.notifications
      : section === "history"
      ? t.menu.chatHistory
      : section === "settings"
      ? t.menu.settings
      : t.menu.title;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={handleCloseMenu}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Slide-Over Panel */}
          <motion.aside
            initial={{ opacity: 0, x: lang === "ar" ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: lang === "ar" ? -24 : 24 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={t.menu.title}
            className="relative z-10 flex h-[100dvh] w-full max-w-2xl flex-col border-s border-[var(--nova-border)] bg-[var(--nova-bg)] text-[var(--nova-text)]"
          >
            {/* Unified Menu Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--nova-border)] bg-[var(--nova-surface)] px-4 py-3 pt-safe sm:px-6">
              {section === "hub" ? (
                <div className="flex items-center gap-2.5">
                  <NovaLogo size={28} />
                  <span className="font-display text-base font-bold tracking-tight text-[var(--nova-text)]">
                    {t.brand} · {t.menu.title}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSection("hub");
                    setSettingsFocus("all");
                  }}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[var(--nova-text)] hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  <span>{sectionHeaderTitle}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseMenu}
                aria-label={t.menu.closeMenu}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Body */}
            {section === "hub" && (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 pb-safe sm:px-6">
                {/* User Identity Summary Banner */}
                <button
                  type="button"
                  onClick={() => setSection("profile")}
                  className="flex w-full items-center gap-3.5 rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] p-4 text-start transition-colors hover:border-[var(--nova-border-strong)] cursor-pointer"
                >
                  <UserAvatar
                    name={profile.displayName}
                    photoUrl={profile.photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate font-display text-base font-bold text-[var(--nova-text)]">
                      {profile.displayName}
                    </p>
                    <p dir="ltr" className="truncate text-xs text-[var(--nova-text-muted)]">
                      {isGuest
                        ? t.auth.guestAccountLabel
                        : profile.email || t.auth.personalAccount}
                    </p>
                    <p className="text-[11px] text-[var(--nova-text-muted)]">
                      {isGuest ? t.profile.guestType : t.profile.registeredType} ·{" "}
                      {t.profile.providerLabels[profile.authProvider]}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--nova-text-muted)] rtl:rotate-180" />
                </button>

                {/* All Sections Inside One Unified Menu */}
                <div className="divide-y divide-[var(--nova-border)] overflow-hidden rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface)]">
                  {menuRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={row.onClick}
                        className="flex min-h-[60px] w-full items-center gap-3.5 px-4 py-3 text-start transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] text-[var(--nova-text)]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--nova-text)]">
                            {row.title}
                          </p>
                          <p className="truncate text-xs text-[var(--nova-text-muted)]">
                            {row.subtitle}
                          </p>
                        </div>
                        {typeof row.badge === "number" && row.badge > 0 && (
                          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[var(--nova-accent)] px-2 text-xs font-bold text-[var(--nova-accent-fg)] tabular-nums">
                            {row.badge}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--nova-text-muted)] rtl:rotate-180" />
                      </button>
                    );
                  })}
                </div>

                {/* Account Actions: Sign Out / Sign In & Delete Account */}
                <div className="space-y-2.5 pt-1">
                  {isGuest ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseMenu();
                        void onRequestSignIn();
                      }}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] px-4 text-sm font-semibold text-[var(--nova-accent-fg)] transition-colors hover:bg-[var(--nova-accent-hover)] cursor-pointer"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>{t.auth.signIn}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseMenu();
                        void onSignOut();
                      }}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-4 text-sm font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t.menu.signOut}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmDeleteOpen(true);
                    }}
                    className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-[var(--nova-surface)] px-4 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 dark:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t.menu.deleteAccount}</span>
                  </button>
                </div>
              </div>
            )}

            {section === "profile" && (
              <ProfileView
                t={t}
                lang={lang}
                profile={profile}
                isGuest={isGuest}
                onUpdateProfile={onUpdateProfile}
              />
            )}

            {section === "notifications" && (
              <NotificationsView
                t={t}
                lang={lang}
                notifications={notifications}
                onMarkRead={onMarkNotificationRead}
                onMarkAllRead={onMarkAllNotificationsRead}
                onClearAll={onClearNotifications}
                onOpenPreferences={() => openSettingsFocused("all")}
              />
            )}

            {section === "history" && (
              <div className="flex min-h-0 flex-1 flex-col px-4 py-5 pb-safe sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    onCreateThread();
                    handleCloseMenu();
                  }}
                  className="mb-4 inline-flex min-h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--nova-accent)] px-4 text-sm font-semibold text-[var(--nova-accent-fg)] transition-colors hover:bg-[var(--nova-accent-hover)] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.chat.newChat}</span>
                </button>

                <HistoryList
                  t={t}
                  threads={threads}
                  activeThreadId={activeThreadId}
                  isStreaming={false}
                  hidePreviews={settings.hidePreviews}
                  searchQuery={historySearch}
                  onSearchChange={setHistorySearch}
                  onSelect={(id) => {
                    onSelectThread(id);
                    handleCloseMenu();
                  }}
                  onRename={onRenameThread}
                  onDelete={onDeleteThread}
                />
              </div>
            )}

            {section === "settings" && (
              <SettingsView
                t={t}
                profile={profile}
                settings={settings}
                threads={threads}
                isGuest={isGuest}
                initialFocusSection={settingsFocus}
                onUpdateProfile={onUpdateProfile}
                onUpdateSettings={onUpdateSettings}
                onClearAllHistory={onClearAllHistory}
                onOpenNotifications={() => setSection("notifications")}
                onOpenHistory={() => setSection("history")}
                onSignOut={async () => {
                  handleCloseMenu();
                  await onSignOut();
                }}
                onDeleteAccount={onDeleteAccount}
              />
            )}
          </motion.aside>

          {/* Delete Account Confirmation Modal Inside Menu */}
          {confirmDeleteOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              onClick={() => !deleting && setConfirmDeleteOpen(false)}
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
                      {t.settings.deleteAccountTitle}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--nova-text-muted)]">
                      {t.settings.deleteAccountBody}
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 dark:text-rose-300">
                    {deleteError}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDeleteOpen(false)}
                    className="min-h-[42px] rounded-xl border border-[var(--nova-border)] px-4 text-xs font-semibold text-[var(--nova-text-muted)] hover:text-[var(--nova-text)] cursor-pointer"
                  >
                    {t.settings.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleConfirmDeleteAccount()}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{t.settings.confirmDeleteAccount}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
