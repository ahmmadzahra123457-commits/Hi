import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  DEFAULT_USER_SETTINGS,
  type AppNotification,
  type AuthProviderKind,
  type ChatMessage,
  type ChatThread,
  type Language,
  type NotificationCategory,
  type UserProfileData,
  type UserSettingsData,
} from "../types";

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (typeof val === "number") return val;
  return Date.now();
}

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

export function detectAuthProvider(user: User): AuthProviderKind {
  if (user.isAnonymous) return "anonymous";
  const providerId = user.providerData?.[0]?.providerId || "";
  if (providerId.includes("google")) return "google";
  if (providerId.includes("apple")) return "apple";
  return "email";
}

function clampPhotoUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 100000) return undefined;
  return trimmed;
}

export async function syncUserProfile(user: User): Promise<UserProfileData> {
  const userPath = `users/${user.uid}`;
  const ref = doc(db, "users", user.uid);
  const authProvider = detectAuthProvider(user);
  const fallbackName = (
    user.displayName ||
    user.email?.split("@")[0] ||
    (authProvider === "anonymous" ? "Guest" : "NOVA User")
  )
    .trim()
    .slice(0, 100);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      const existingName =
        typeof data.displayName === "string" && data.displayName.trim()
          ? data.displayName.trim().slice(0, 100)
          : fallbackName;
      const existingPhoto = clampPhotoUrl(
        typeof data.photoUrl === "string" ? data.photoUrl : user.photoURL
      );
      const onboardingCompleted =
        typeof data.onboardingCompleted === "boolean"
          ? data.onboardingCompleted
          : Boolean(existingName && existingName !== "NOVA User" && existingName !== "Guest");

      await updateDoc(ref, {
        displayName: existingName || "NOVA User",
        ...(user.email ? { email: user.email.slice(0, 254) } : {}),
        ...(existingPhoto !== undefined ? { photoUrl: existingPhoto } : {}),
        authProvider,
        onboardingCompleted,
        updatedAt: serverTimestamp(),
      });

      return {
        uid: user.uid,
        displayName: existingName,
        email: typeof data.email === "string" ? data.email : user.email || undefined,
        photoUrl: existingPhoto,
        authProvider,
        onboardingCompleted,
        createdAt: toMillis(data.createdAt),
        updatedAt: Date.now(),
      };
    }

    const initialPhoto = clampPhotoUrl(user.photoURL);
    await setDoc(ref, {
      uid: user.uid,
      displayName: fallbackName || "NOVA User",
      ...(user.email ? { email: user.email.slice(0, 254) } : {}),
      ...(initialPhoto ? { photoUrl: initialPhoto } : {}),
      authProvider,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid: user.uid,
      displayName: fallbackName || "NOVA User",
      email: user.email || undefined,
      photoUrl: initialPhoto,
      authProvider,
      onboardingCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToUserProfile(
  userId: string,
  onData: (profile: UserProfileData) => void,
  onError: (err: Error) => void
): () => void {
  const userPath = `users/${userId}`;
  const ref = doc(db, "users", userId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      onData({
        uid: userId,
        displayName:
          typeof data.displayName === "string" ? data.displayName : "NOVA User",
        email: typeof data.email === "string" ? data.email : undefined,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : undefined,
        authProvider:
          data.authProvider === "google" ||
          data.authProvider === "apple" ||
          data.authProvider === "anonymous"
            ? data.authProvider
            : "email",
        onboardingCompleted: Boolean(data.onboardingCompleted),
        createdAt: toMillis(data.createdAt),
        updatedAt: toMillis(data.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export async function updateUserProfileInFirestore(
  userId: string,
  updates: {
    displayName?: string;
    photoUrl?: string;
    onboardingCompleted?: boolean;
  }
): Promise<void> {
  const userPath = `users/${userId}`;
  const ref = doc(db, "users", userId);

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof updates.displayName === "string") {
    const cleanName = updates.displayName.trim().slice(0, 100);
    if (cleanName) {
      payload.displayName = cleanName;
    }
  }
  if (typeof updates.photoUrl === "string") {
    payload.photoUrl = updates.photoUrl.slice(0, 100000);
  }
  if (typeof updates.onboardingCompleted === "boolean") {
    payload.onboardingCompleted = updates.onboardingCompleted;
  }

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeToUserSettings(
  userId: string,
  onData: (settings: UserSettingsData) => void,
  onError: (err: Error) => void
): () => void {
  const settingsPath = `users/${userId}/settings/default`;
  const ref = doc(db, "users", userId, "settings", "default");

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onData({
        theme: d.theme === "light" ? "light" : "dark",
        accentColor:
          d.accentColor === "blue" ||
          d.accentColor === "emerald" ||
          d.accentColor === "amber" ||
          d.accentColor === "rose" ||
          d.accentColor === "violet"
            ? d.accentColor
            : "mono",
        language: d.language === "ar" ? "ar" : "en",
        chatDensity: d.chatDensity === "compact" ? "compact" : "comfortable",
        fontSize: d.fontSize === "sm" || d.fontSize === "lg" ? d.fontSize : "md",
        typingSpeed:
          d.typingSpeed === "natural" || d.typingSpeed === "instant"
            ? d.typingSpeed
            : "fast",
        hapticsEnabled: typeof d.hapticsEnabled === "boolean" ? d.hapticsEnabled : true,
        soundEnabled: typeof d.soundEnabled === "boolean" ? d.soundEnabled : false,
        notificationsEnabled:
          typeof d.notificationsEnabled === "boolean" ? d.notificationsEnabled : true,
        featureAnnouncements:
          typeof d.featureAnnouncements === "boolean" ? d.featureAnnouncements : true,
        accountAlerts: typeof d.accountAlerts === "boolean" ? d.accountAlerts : true,
        autoSaveHistory:
          typeof d.autoSaveHistory === "boolean" ? d.autoSaveHistory : true,
        hidePreviews: typeof d.hidePreviews === "boolean" ? d.hidePreviews : false,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, settingsPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export async function saveUserSettingsInFirestore(
  userId: string,
  settings: UserSettingsData
): Promise<void> {
  const settingsPath = `users/${userId}/settings/default`;
  const ref = doc(db, "users", userId, "settings", "default");
  const normalized: UserSettingsData = {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
  };

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...normalized,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId,
        ...normalized,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, settingsPath);
  }
}

export function subscribeToNotifications(
  userId: string,
  onData: (items: AppNotification[]) => void,
  onError: (err: Error) => void
): () => void {
  const colPath = `users/${userId}/notifications`;
  const q = query(
    collection(db, "users", userId, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AppNotification[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: typeof data.title === "string" ? data.title : "",
          body: typeof data.body === "string" ? data.body : "",
          category:
            data.category === "account" || data.category === "system"
              ? data.category
              : "feature",
          read: Boolean(data.read),
          createdAt: toMillis(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export async function createNotificationInFirestore(
  userId: string,
  notification: {
    id?: string;
    title: string;
    body: string;
    category: NotificationCategory;
  }
): Promise<void> {
  const safeId = sanitizeFirestoreId(
    notification.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  );
  const docPath = `users/${userId}/notifications/${safeId}`;
  const ref = doc(db, "users", userId, "notifications", safeId);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) return;
    await setDoc(ref, {
      userId,
      title: notification.title.trim().slice(0, 160) || "NOVA AI",
      body: notification.body.trim().slice(0, 600) || "Update",
      category: notification.category,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function seedInitialNotificationsInFirestore(
  userId: string,
  lang: Language
): Promise<void> {
  const seededKey = `nova_ai_seeded_notifs_${userId}`;
  try {
    if (localStorage.getItem(seededKey) === "1") return;
  } catch {
    // continue
  }

  const starterNotifs: Array<{
    id: string;
    title: string;
    body: string;
    category: NotificationCategory;
  }> =
    lang === "ar"
      ? [
          {
            id: "welcome_nova_v2",
            title: "هلا بك في NOVA AI",
            body: "حسابك مجاني بالكامل للأبد، وكل محادثاتك وإعداداتك محفوظة بشكل خاص في حسابك.",
            category: "account",
          },
          {
            id: "feature_personalization_v2",
            title: "ميزة جديدة: تخصيص المظهر والألوان",
            body: "تقدر الحين تغير بين الوضع الأسود النقي والوضع الفاتح، وتختار لونك المفضل من الإعدادات.",
            category: "feature",
          },
        ]
      : [
          {
            id: "welcome_nova_v2",
            title: "Welcome to NOVA AI",
            body: "Your account is completely free forever, with private chat history and synced preferences.",
            category: "account",
          },
          {
            id: "feature_personalization_v2",
            title: "New: Themes & App Personalization",
            body: "Switch between Pure Black and Light mode, choose your accent color, and tailor your chat view in Settings.",
            category: "feature",
          },
        ];

  for (const item of starterNotifs) {
    await createNotificationInFirestore(userId, item);
  }

  try {
    localStorage.setItem(seededKey, "1");
  } catch {
    // ignore
  }
}

export async function markNotificationReadInFirestore(
  userId: string,
  notificationId: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(notificationId);
  const docPath = `users/${userId}/notifications/${safeId}`;
  const ref = doc(db, "users", userId, "notifications", safeId);
  try {
    await updateDoc(ref, {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function markAllNotificationsReadInFirestore(
  userId: string
): Promise<void> {
  const colPath = `users/${userId}/notifications`;
  try {
    const snap = await getDocs(
      query(
        collection(db, "users", userId, "notifications"),
        where("userId", "==", userId)
      )
    );
    const batch = writeBatch(db);
    let count = 0;
    for (const d of snap.docs) {
      if (d.data().read !== true) {
        batch.update(d.ref, { read: true, updatedAt: serverTimestamp() });
        count++;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, colPath);
  }
}

export async function clearNotificationsInFirestore(userId: string): Promise<void> {
  const colPath = `users/${userId}/notifications`;
  try {
    const snap = await getDocs(
      query(
        collection(db, "users", userId, "notifications"),
        where("userId", "==", userId)
      )
    );
    if (snap.empty) return;
    const batch = writeBatch(db);
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, colPath);
  }
}

export function subscribeToUserConversations(
  userId: string,
  onData: (threads: ChatThread[]) => void,
  onError: (err: Error) => void
): () => void {
  const colPath = `users/${userId}/conversations`;
  const q = query(
    collection(db, "users", userId, "conversations"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChatThread[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: typeof data.title === "string" ? data.title : "New Chat",
          customTitle: Boolean(data.customTitle),
          isPersisted: true,
          messages: [],
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export function subscribeToConversationMessages(
  userId: string,
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (err: Error) => void
): () => void {
  const safeConvId = sanitizeFirestoreId(conversationId);
  const colPath = `users/${userId}/conversations/${safeConvId}/messages`;
  const q = query(
    collection(db, "users", userId, "conversations", safeConvId, "messages"),
    where("userId", "==", userId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          role: data.role === "model" ? "model" : "user",
          text: typeof data.text === "string" ? data.text : "",
          createdAt: toMillis(data.createdAt),
        };
      });
      onData(msgs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export async function ensureConversationExists(
  userId: string,
  thread: ChatThread
): Promise<void> {
  const safeId = sanitizeFirestoreId(thread.id);
  const docPath = `users/${userId}/conversations/${safeId}`;
  const ref = doc(db, "users", userId, "conversations", safeId);
  const safeTitle = (thread.title || "New Chat").trim().slice(0, 120) || "New Chat";

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        title: safeTitle,
        customTitle: Boolean(thread.customTitle),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId,
        title: safeTitle,
        customTitle: Boolean(thread.customTitle),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function saveMessageToFirestore(
  userId: string,
  conversationId: string,
  message: ChatMessage
): Promise<void> {
  const safeConvId = sanitizeFirestoreId(conversationId);
  const safeMsgId = sanitizeFirestoreId(message.id);
  const trimmedText = message.text.slice(0, 32000);
  if (!trimmedText.trim()) return;

  const msgPath = `users/${userId}/conversations/${safeConvId}/messages/${safeMsgId}`;
  const msgRef = doc(
    db,
    "users",
    userId,
    "conversations",
    safeConvId,
    "messages",
    safeMsgId
  );
  const convRef = doc(db, "users", userId, "conversations", safeConvId);

  try {
    await setDoc(msgRef, {
      userId,
      conversationId: safeConvId,
      role: message.role === "model" ? "model" : "user",
      text: trimmedText,
      createdAt: serverTimestamp(),
    });
    await updateDoc(convRef, {
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
  }
}

export async function persistConversationMessage(
  userId: string,
  thread: ChatThread,
  message: ChatMessage
): Promise<void> {
  if (!message.text.trim()) return;
  await ensureConversationExists(userId, thread);
  await saveMessageToFirestore(userId, thread.id, message);
}

export async function renameConversationInFirestore(
  userId: string,
  conversationId: string,
  newTitle: string
): Promise<void> {
  const safeConvId = sanitizeFirestoreId(conversationId);
  const docPath = `users/${userId}/conversations/${safeConvId}`;
  const ref = doc(db, "users", userId, "conversations", safeConvId);
  const safeTitle = newTitle.trim().slice(0, 120);
  if (!safeTitle) return;

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) return;
    await updateDoc(ref, {
      title: safeTitle,
      customTitle: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteConversationInFirestore(
  userId: string,
  conversationId: string
): Promise<void> {
  const safeConvId = sanitizeFirestoreId(conversationId);
  const convPath = `users/${userId}/conversations/${safeConvId}`;
  const msgsPath = `${convPath}/messages`;

  try {
    const convRef = doc(db, "users", userId, "conversations", safeConvId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) return;

    const msgsSnap = await getDocs(
      query(
        collection(db, "users", userId, "conversations", safeConvId, "messages"),
        where("userId", "==", userId)
      )
    );
    const batch = writeBatch(db);
    for (const msgDoc of msgsSnap.docs) {
      batch.delete(msgDoc.ref);
    }
    batch.delete(convRef);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, msgsPath);
  }
}

export async function clearConversationMessagesInFirestore(
  userId: string,
  conversationId: string,
  defaultTitle: string
): Promise<void> {
  const safeConvId = sanitizeFirestoreId(conversationId);
  const convPath = `users/${userId}/conversations/${safeConvId}`;
  try {
    const convRef = doc(db, "users", userId, "conversations", safeConvId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) return;

    const msgsSnap = await getDocs(
      query(
        collection(db, "users", userId, "conversations", safeConvId, "messages"),
        where("userId", "==", userId)
      )
    );
    const batch = writeBatch(db);
    for (const msgDoc of msgsSnap.docs) {
      batch.delete(msgDoc.ref);
    }
    batch.update(convRef, {
      title: defaultTitle.slice(0, 120) || "New Chat",
      customTitle: false,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, convPath);
  }
}

export async function clearAllConversationsInFirestore(userId: string): Promise<void> {
  const colPath = `users/${userId}/conversations`;
  try {
    const convsSnap = await getDocs(
      query(collection(db, "users", userId, "conversations"), where("userId", "==", userId))
    );
    for (const convDoc of convsSnap.docs) {
      await deleteConversationInFirestore(userId, convDoc.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, colPath);
  }
}

export async function deleteEntireAccountDataInFirestore(userId: string): Promise<void> {
  const userPath = `users/${userId}`;
  try {
    await clearAllConversationsInFirestore(userId);
    await clearNotificationsInFirestore(userId);

    const settingsRef = doc(db, "users", userId, "settings", "default");
    const settingsSnap = await getDoc(settingsRef);
    const batch = writeBatch(db);
    if (settingsSnap.exists()) {
      batch.delete(settingsRef);
    }
    batch.delete(doc(db, "users", userId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, userPath);
  }
}
