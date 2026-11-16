import type { Language } from "../types";

const LANG_STORAGE_KEY = "nova_ai_lang";
const LANG_MANUAL_KEY = "nova_ai_lang_manual";

export function detectDeviceLanguage(): Language {
  if (typeof navigator === "undefined") return "en";

  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }

  for (const locale of candidates) {
    const normalized = locale.trim().toLowerCase();
    if (!normalized) continue;
    if (normalized === "ar" || normalized.startsWith("ar-")) {
      return "ar";
    }
    if (normalized === "en" || normalized.startsWith("en-")) {
      return "en";
    }
  }

  return "en";
}

export function resolveInitialLanguage(): Language {
  try {
    const isManual = localStorage.getItem(LANG_MANUAL_KEY) === "1";
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isManual && (saved === "ar" || saved === "en")) {
      return saved;
    }
  } catch {
    // ignore storage failures
  }
  return detectDeviceLanguage();
}

export function saveManualLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    localStorage.setItem(LANG_MANUAL_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasManualLanguageOverride(): boolean {
  try {
    return localStorage.getItem(LANG_MANUAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearManualLanguageOverride(): void {
  try {
    localStorage.removeItem(LANG_MANUAL_KEY);
    localStorage.removeItem(LANG_STORAGE_KEY);
  } catch {
    // ignore
  }
}
