export type Language = "en" | "ar";

export type ThemeMode = "dark" | "light";

export type AccentColor = "mono" | "blue" | "emerald" | "amber" | "rose" | "violet";

export type ChatDensity = "comfortable" | "compact";

export type FontSizeOption = "sm" | "md" | "lg";

export type TypingSpeedOption = "fast" | "natural" | "instant";

export type AuthProviderKind = "google" | "apple" | "email" | "anonymous";

export type NotificationCategory = "feature" | "account" | "system";

export type ActiveAppView = "chat" | "profile" | "settings" | "notifications";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  title: string;
  customTitle?: boolean;
  isPersisted?: boolean;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface UserProfileData {
  uid: string;
  displayName: string;
  email?: string;
  photoUrl?: string;
  authProvider: AuthProviderKind;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserSettingsData {
  theme: ThemeMode;
  accentColor: AccentColor;
  language: Language;
  chatDensity: ChatDensity;
  fontSize: FontSizeOption;
  typingSpeed: TypingSpeedOption;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  featureAnnouncements: boolean;
  accountAlerts: boolean;
  autoSaveHistory: boolean;
  hidePreviews: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  read: boolean;
  createdAt: number;
}

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  theme: "dark",
  accentColor: "mono",
  language: "en",
  chatDensity: "comfortable",
  fontSize: "md",
  typingSpeed: "fast",
  hapticsEnabled: true,
  soundEnabled: false,
  notificationsEnabled: true,
  featureAnnouncements: true,
  accountAlerts: true,
  autoSaveHistory: true,
  hidePreviews: false,
};
