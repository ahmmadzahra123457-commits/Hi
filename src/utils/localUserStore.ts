import {
  DEFAULT_USER_SETTINGS,
  type AppNotification,
  type Language,
  type UserProfileData,
  type UserSettingsData,
} from "../types";

const LS_GUEST_PROFILE = "nova_ai_guest_profile";
const LS_GUEST_SETTINGS = "nova_ai_guest_settings";
const LS_GUEST_NOTIFICATIONS = "nova_ai_guest_notifications";
const LS_MANUAL_LANG = "nova_ai_lang_manual";

export function detectDeviceLanguage(): Language {
  try {
    const manual = localStorage.getItem(LS_MANUAL_LANG);
    if (manual === "ar" || manual === "en") {
      return manual;
    }
    const candidates =
      typeof navigator !== "undefined"
        ? [navigator.language, ...(navigator.languages || [])]
        : [];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.toLowerCase().startsWith("ar")) {
        return "ar";
      }
    }
  } catch {
    // ignore
  }
  return "en";
}

export function saveManualLanguagePreference(lang: Language): void {
  try {
    localStorage.setItem(LS_MANUAL_LANG, lang);
  } catch {
    // ignore
  }
}

export function loadLocalGuestProfile(): UserProfileData {
  try {
    const raw = localStorage.getItem(LS_GUEST_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfileData>;
      return {
        uid: "guest",
        displayName:
          typeof parsed.displayName === "string" && parsed.displayName.trim()
            ? parsed.displayName.trim()
            : "Guest",
        photoUrl: typeof parsed.photoUrl === "string" ? parsed.photoUrl : undefined,
        authProvider: "anonymous",
        onboardingCompleted: Boolean(parsed.onboardingCompleted),
        createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      };
    }
  } catch {
    // ignore
  }

  const fresh: UserProfileData = {
    uid: "guest",
    displayName: "Guest",
    authProvider: "anonymous",
    onboardingCompleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveLocalGuestProfile(fresh);
  return fresh;
}

export function saveLocalGuestProfile(profile: UserProfileData): void {
  try {
    localStorage.setItem(LS_GUEST_PROFILE, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function loadLocalUserSettings(keySuffix = "guest"): UserSettingsData {
  const detectedLang = detectDeviceLanguage();
  try {
    const raw = localStorage.getItem(`${LS_GUEST_SETTINGS}_${keySuffix}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserSettingsData>;
      let manual: string | null = null;
      try {
        manual = localStorage.getItem(LS_MANUAL_LANG);
      } catch {
        manual = null;
      }
      return {
        ...DEFAULT_USER_SETTINGS,
        ...parsed,
        language:
          manual === "ar" || manual === "en"
            ? manual
            : parsed.language === "ar" || parsed.language === "en"
            ? parsed.language
            : detectedLang,
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_USER_SETTINGS, language: detectedLang };
}

export function saveLocalUserSettings(
  settings: UserSettingsData,
  keySuffix = "guest"
): void {
  try {
    localStorage.setItem(`${LS_GUEST_SETTINGS}_${keySuffix}`, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadCachedUserProfile(uid: string): UserProfileData | null {
  try {
    const raw = localStorage.getItem(`nova_ai_cached_profile_${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfileData;
  } catch {
    return null;
  }
}

export function saveCachedUserProfile(profile: UserProfileData): void {
  try {
    localStorage.setItem(`nova_ai_cached_profile_${profile.uid}`, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function loadLocalGuestNotifications(lang: Language): AppNotification[] {
  try {
    const raw = localStorage.getItem(LS_GUEST_NOTIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AppNotification[];
    }
  } catch {
    // ignore
  }

  const now = Date.now();
  const initial: AppNotification[] =
    lang === "ar"
      ? [
          {
            id: "guest_welcome",
            title: "هلا بك في NOVA AI",
            body: "تقدر تجرب التطبيق بالكامل مجاناً كضيف، أو تنشئ حساب شخصي عشان تحفظ محادثاتك وتخصيصك دائماً.",
            category: "account",
            read: false,
            createdAt: now,
          },
          {
            id: "guest_features",
            title: "تخصيص الواجهة والألوان",
            body: "جرب التبديل بين الوضع الأسود النقي والوضع الفاتح واختر لونك المفضل من الإعدادات.",
            category: "feature",
            read: false,
            createdAt: now - 1000,
          },
        ]
      : [
          {
            id: "guest_welcome",
            title: "Welcome to NOVA AI",
            body: "NOVA AI is completely free forever. Create a personal account anytime to sync chats and preferences.",
            category: "account",
            read: false,
            createdAt: now,
          },
          {
            id: "guest_features",
            title: "New: Themes & App Personalization",
            body: "Customize Pure Black or Light mode, accent colors, typing speed, and notifications in Settings.",
            category: "feature",
            read: false,
            createdAt: now - 1000,
          },
        ];

  saveLocalGuestNotifications(initial);
  return initial;
}

export function saveLocalGuestNotifications(items: AppNotification[]): void {
  try {
    localStorage.setItem(LS_GUEST_NOTIFICATIONS, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function clearAllLocalGuestData(): void {
  try {
    localStorage.removeItem(LS_GUEST_PROFILE);
    localStorage.removeItem(`${LS_GUEST_SETTINGS}_guest`);
    localStorage.removeItem(LS_GUEST_NOTIFICATIONS);
    localStorage.removeItem("nova_ai_guest_threads");
    localStorage.removeItem("nova_ai_guest_active_thread_id");
    localStorage.removeItem("nova_ai_local_guest");
    if (typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase("nova_ai_guest_db");
    }
  } catch {
    // ignore
  }
}
