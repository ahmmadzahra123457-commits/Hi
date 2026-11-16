import { useState } from "react";
import { motion } from "motion/react";
import {
  Bell,
  Check,
  CheckCheck,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { TranslationCopy } from "../i18n";
import type { AppNotification, Language } from "../types";

interface NotificationsViewProps {
  t: TranslationCopy;
  lang: Language;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onOpenPreferences: () => void;
}

export function NotificationsView({
  t,
  lang,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onOpenPreferences,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const formatTime = (ms: number) =>
    new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--nova-bg)] px-4 py-6 pb-24 sm:px-8 sm:py-8 lg:pb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-3xl space-y-6"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--nova-text)]">
              {t.notifications.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--nova-text-muted)]">
              {t.notifications.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenPreferences}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[var(--nova-border)] px-3.5 py-2 text-xs font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{t.notifications.preferencesLink}</span>
          </button>
        </div>

        {/* Filter & Batch Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] p-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`min-h-[36px] rounded-lg px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                  : "text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
              }`}
            >
              {t.notifications.allTab} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`min-h-[36px] rounded-lg px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                filter === "unread"
                  ? "bg-[var(--nova-accent)] text-[var(--nova-accent-fg)]"
                  : "text-[var(--nova-text-muted)] hover:text-[var(--nova-text)]"
              }`}
            >
              {t.notifications.unreadTab} ({unreadCount})
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--nova-border)] px-3 py-1.5 text-xs font-medium text-[var(--nova-text)] hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>{t.notifications.markAllRead}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--nova-border)] px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 dark:text-rose-300 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t.notifications.clearAll}</span>
              </button>
            </div>
          )}
        </div>

        {/* Feed */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] text-[var(--nova-text-muted)]">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="font-display text-base font-semibold text-[var(--nova-text)]">
              {t.notifications.emptyTitle}
            </h2>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--nova-text-muted)]">
              {t.notifications.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--nova-border)] overflow-hidden rounded-2xl border border-[var(--nova-border)] bg-[var(--nova-surface)]">
            {visible.map((item) => {
              const Icon =
                item.category === "account"
                  ? ShieldCheck
                  : item.category === "feature"
                  ? Sparkles
                  : Bell;

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3.5 p-4 transition-colors sm:p-5 ${
                    item.read ? "opacity-75" : "bg-[var(--nova-accent-soft)]"
                  }`}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)]">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--nova-text-muted)]">
                      <span className="font-semibold text-[var(--nova-text)]">
                        {t.notifications.categories[item.category]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatTime(item.createdAt)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--nova-text)]">
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[var(--nova-text-muted)]">
                      {item.body}
                    </p>
                  </div>

                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(item.id)}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--nova-text)] hover:bg-[var(--nova-accent-soft)] cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>{t.notifications.markRead}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
