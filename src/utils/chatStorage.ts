import type { ChatThread } from "../types";

const DB_NAME = "nova_ai_guest_db";
const DB_VERSION = 1;
const STORE_NAME = "threads";
const LS_THREADS_KEY = "nova_ai_guest_threads";
const LS_ACTIVE_ID_KEY = "nova_ai_guest_active_thread_id";

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function normalizeThreads(raw: unknown): ChatThread[] {
  if (!Array.isArray(raw)) return [];
  const valid: ChatThread[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Partial<ChatThread>;
    if (typeof obj.id !== "string" || !Array.isArray(obj.messages)) continue;
    valid.push({
      id: obj.id,
      title: typeof obj.title === "string" && obj.title.trim() ? obj.title : "New Chat",
      customTitle: Boolean(obj.customTitle),
      messages: obj.messages.filter(
        (m) => m && typeof m.id === "string" && typeof m.text === "string"
      ),
      createdAt: typeof obj.createdAt === "number" ? obj.createdAt : obj.updatedAt || Date.now(),
      updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
    });
  }
  return valid.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadThreadsSync(): ChatThread[] {
  try {
    const raw = localStorage.getItem(LS_THREADS_KEY);
    if (!raw) return [];
    return normalizeThreads(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function loadThreadsFromPersistentStore(): Promise<ChatThread[]> {
  const db = await openDatabase();
  if (!db) {
    return loadThreadsSync();
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const dbThreads = normalizeThreads(req.result);
        const lsThreads = loadThreadsSync();

        const mergedMap = new Map<string, ChatThread>();
        for (const item of [...lsThreads, ...dbThreads]) {
          const existing = mergedMap.get(item.id);
          if (
            !existing ||
            item.updatedAt > existing.updatedAt ||
            item.messages.length > existing.messages.length
          ) {
            mergedMap.set(item.id, item);
          }
        }
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        resolve(merged);
      };
      req.onerror = () => resolve(loadThreadsSync());
    } catch {
      resolve(loadThreadsSync());
    }
  });
}

export function saveThreadsSync(threads: ChatThread[]) {
  try {
    localStorage.setItem(LS_THREADS_KEY, JSON.stringify(threads));
  } catch {
    try {
      localStorage.setItem(LS_THREADS_KEY, JSON.stringify(threads.slice(0, 30)));
    } catch {
      // ignore
    }
  }
}

export async function saveThreadsToPersistentStore(threads: ChatThread[]) {
  saveThreadsSync(threads);

  const db = await openDatabase();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const thread of threads) {
      store.put(thread);
    }
  } catch {
    // ignore IndexedDB write failure
  }
}

export function loadActiveThreadId(): string {
  try {
    return localStorage.getItem(LS_ACTIVE_ID_KEY) || "";
  } catch {
    return "";
  }
}

export function saveActiveThreadId(id: string) {
  try {
    localStorage.setItem(LS_ACTIVE_ID_KEY, id);
  } catch {
    // ignore
  }
}

export function generateConversationTitle(firstPrompt: string): string {
  const cleaned = firstPrompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Chat";
  if (cleaned.length <= 42) return cleaned;

  const sliced = cleaned.slice(0, 42);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > 20) {
    return `${sliced.slice(0, lastSpace)}...`;
  }
  return `${sliced}...`;
}
