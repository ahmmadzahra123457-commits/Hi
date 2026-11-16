import { useMemo, useState } from "react";
import { Check, MessageSquare, Pencil, Search, Trash2, X } from "lucide-react";
import type { TranslationCopy } from "../i18n";
import type { ChatThread } from "../types";

type DateGroupKey = "today" | "yesterday" | "previous7Days" | "older";

function getDateGroup(timestamp: number): DateGroupKey {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday) return "today";
  if (timestamp >= startOfToday - oneDay) return "yesterday";
  if (timestamp >= startOfToday - 7 * oneDay) return "previous7Days";
  return "older";
}

interface HistoryListProps {
  t: TranslationCopy;
  threads: ChatThread[];
  activeThreadId: string;
  isStreaming: boolean;
  hidePreviews: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function HistoryList({
  t,
  threads,
  activeThreadId,
  isStreaming,
  hidePreviews,
  searchQuery,
  onSearchChange,
  onSelect,
  onRename,
  onDelete,
}: HistoryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const savedThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threads
      .filter((th) => th.isPersisted || th.messages.length > 0 || th.id === activeThreadId)
      .filter((th) => {
        if (!q) return true;
        if (hidePreviews) return false;
        const inTitle = th.title.toLowerCase().includes(q);
        const inMessages = th.messages.some((m) => m.text.toLowerCase().includes(q));
        return inTitle || inMessages;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [threads, activeThreadId, searchQuery, hidePreviews]);

  const grouped = useMemo(() => {
    const map: Record<DateGroupKey, ChatThread[]> = {
      today: [],
      yesterday: [],
      previous7Days: [],
      older: [],
    };
    for (const th of savedThreads) {
      map[getDateGroup(th.updatedAt)].push(th);
    }
    return map;
  }, [savedThreads]);

  const startEditing = (thread: ChatThread) => {
    setEditingId(thread.id);
    setEditingValue(thread.title);
  };

  const commitEditing = (id: string) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setEditingId(null);
    setEditingValue("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const groupOrder: DateGroupKey[] = ["today", "yesterday", "previous7Days", "older"];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--nova-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.chat.searchPlaceholder}
          className="min-h-[38px] w-full rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] ps-8 pe-3 text-xs text-[var(--nova-text)] placeholder:text-[var(--nova-text-muted)] focus:border-[var(--nova-border-strong)] focus:outline-none"
        />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {savedThreads.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[var(--nova-text-muted)]">
            {searchQuery.trim() ? t.chat.noHistoryMatch : t.chat.emptyHistory}
          </p>
        ) : (
          groupOrder.map((groupKey) => {
            const items = grouped[groupKey];
            if (items.length === 0) return null;
            return (
              <div key={groupKey} className="space-y-1">
                <p className="px-2 pb-1 text-[11px] font-medium text-[var(--nova-text-muted)]">
                  {t.chat.groups[groupKey]}
                </p>
                {items.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const isEditing = editingId === thread.id;
                  const displayTitle = hidePreviews ? t.chat.previewHidden : thread.title;

                  if (isEditing) {
                    return (
                      <div
                        key={thread.id}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--nova-border-strong)] bg-[var(--nova-accent-soft)] p-1.5"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEditing(thread.id);
                            } else if (e.key === "Escape") {
                              cancelEditing();
                            }
                          }}
                          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-[var(--nova-text)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => commitEditing(thread.id)}
                          aria-label={t.chat.saveName}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--nova-accent)] text-[var(--nova-accent-fg)] cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          aria-label={t.chat.cancelRename}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--nova-text-muted)] hover:bg-[var(--nova-accent-soft)] hover:text-[var(--nova-text)] cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={thread.id}
                      className={`group flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-sm transition-colors ${
                        isActive
                          ? "border-[var(--nova-border-strong)] bg-[var(--nova-accent-soft)] text-[var(--nova-text)]"
                          : "border-transparent text-[var(--nova-text-muted)] hover:bg-[var(--nova-accent-soft)] hover:text-[var(--nova-text)]"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isStreaming}
                        onClick={() => onSelect(thread.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-start disabled:opacity-60 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate text-[13px]">{displayTitle}</span>
                      </button>

                      <div className="flex shrink-0 items-center gap-0.5">
                        {!hidePreviews && (
                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => startEditing(thread)}
                            aria-label={t.chat.renameChat}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--nova-text-muted)] transition-colors hover:bg-[var(--nova-accent-soft)] hover:text-[var(--nova-text)] disabled:opacity-40 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isStreaming}
                          onClick={() => onDelete(thread.id)}
                          aria-label={t.chat.deleteChat}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--nova-text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-300 disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
