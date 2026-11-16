import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Menu, X } from "lucide-react";
import { translations } from "./i18n";
import {
  DEFAULT_USER_SETTINGS,
  type AppNotification,
  type ChatMessage,
  type ChatThread,
  type Language,
  type UserProfileData,
  type UserSettingsData,
} from "./types";
import { ChatView } from "./components/ChatView";
import { AuthScreen } from "./components/AuthScreen";
import { OnboardingView } from "./components/OnboardingView";
import { UnifiedTopMenu } from "./components/UnifiedTopMenu";
import { NovaLogo } from "./components/NovaLogo";
import {
  auth,
  deleteUser,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "./firebase";
import type { User } from "./firebase";
import {
  clearAllConversationsInFirestore,
  clearConversationMessagesInFirestore,
  clearNotificationsInFirestore,
  createNotificationInFirestore,
  deleteConversationInFirestore,
  deleteEntireAccountDataInFirestore,
  detectAuthProvider,
  markAllNotificationsReadInFirestore,
  markNotificationReadInFirestore,
  persistConversationMessage,
  renameConversationInFirestore,
  saveUserSettingsInFirestore,
  seedInitialNotificationsInFirestore,
  subscribeToConversationMessages,
  subscribeToNotifications,
  subscribeToUserConversations,
  subscribeToUserProfile,
  subscribeToUserSettings,
  syncUserProfile,
  updateUserProfileInFirestore,
} from "./utils/firestoreChat";
import {
  loadActiveThreadId,
  loadThreadsFromPersistentStore,
  loadThreadsSync,
  saveActiveThreadId,
  saveThreadsToPersistentStore,
} from "./utils/chatStorage";
import {
  clearAllLocalGuestData,
  detectDeviceLanguage,
  loadCachedUserProfile,
  loadLocalGuestNotifications,
  loadLocalGuestProfile,
  loadLocalUserSettings,
  saveCachedUserProfile,
  saveLocalGuestNotifications,
  saveLocalGuestProfile,
  saveLocalUserSettings,
  saveManualLanguagePreference,
} from "./utils/localUserStore";
import { playSubtleSound } from "./utils/mediaAndAudio";

const LOCAL_GUEST_KEY = "nova_ai_local_guest";

function createInitialThread(lang: Language): ChatThread {
  const now = Date.now();
  return {
    id: `thread-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: translations[lang].chat.defaultThreadTitle,
    customTitle: false,
    isPersisted: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function getUserActiveThreadKey(uid: string): string {
  return `nova_ai_active_thread_${uid}`;
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLocalGuest, setIsLocalGuest] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCAL_GUEST_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [settings, setSettings] = useState<UserSettingsData>(() =>
    loadLocalUserSettings("guest")
  );
  const [profileReady, setProfileReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastNotif, setToastNotif] = useState<AppNotification | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [threads, setThreads] = useState<ChatThread[]>(() => [
    createInitialThread(detectDeviceLanguage()),
  ]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");

  const lang = settings.language;
  const langRef = useRef(lang);
  langRef.current = lang;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const pendingMessageIdsRef = useRef<Set<string>>(new Set());
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastSeenNotifIdRef = useRef<string | null>(null);

  const t = translations[lang];

  // Apply Theme Mode (Pure Black #000000 default / Light), Accent Color, and Document Direction
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    root.classList.toggle("dark", settings.theme === "dark");
    root.dataset.accent = settings.accentColor;

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", settings.theme === "dark" ? "#000000" : "#FFFFFF");
    }
  }, [lang, settings.theme, settings.accentColor]);

  // Listen to Firebase Auth state (persisted locally across reloads/reopens)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          localStorage.removeItem(LOCAL_GUEST_KEY);
        } catch {
          // ignore
        }
        setIsLocalGuest(false);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Hydrate profile, settings, notifications, and conversations for active session
  useEffect(() => {
    if (!authReady) return;

    if (!firebaseUser && !isLocalGuest) {
      setProfileReady(true);
      setUserProfile(null);
      setNotifications([]);
      setThreads([]);
      setActiveThreadId("");
      setMenuOpen(false);
      return;
    }

    // Local Guest Mode
    if (!firebaseUser && isLocalGuest) {
      let active = true;
      const guestProfile = loadLocalGuestProfile();
      const guestSettings = loadLocalUserSettings("guest");
      const guestNotifs = loadLocalGuestNotifications(guestSettings.language);

      setUserProfile(guestProfile);
      setSettings(guestSettings);
      setNotifications(guestNotifs);
      setProfileReady(true);

      const syncInitial = loadThreadsSync();
      if (syncInitial.length > 0) {
        setThreads(syncInitial);
        const savedId = loadActiveThreadId();
        setActiveThreadId(
          savedId && syncInitial.some((item) => item.id === savedId)
            ? savedId
            : syncInitial[0].id
        );
      } else {
        const fresh = createInitialThread(guestSettings.language);
        setThreads([fresh]);
        setActiveThreadId(fresh.id);
      }

      void loadThreadsFromPersistentStore().then((stored) => {
        if (!active || stored.length === 0) return;
        setThreads((current) => {
          const map = new Map<string, ChatThread>();
          for (const item of [...stored, ...current]) {
            const existing = map.get(item.id);
            if (
              !existing ||
              item.messages.length > existing.messages.length ||
              item.updatedAt > existing.updatedAt
            ) {
              map.set(item.id, item);
            }
          }
          return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        });
        setActiveThreadId((prevId) => {
          if (prevId && stored.some((s) => s.id === prevId)) return prevId;
          return prevId || stored[0].id;
        });
      });

      return () => {
        active = false;
      };
    }

    // Authenticated Firebase User
    if (firebaseUser) {
      const uid = firebaseUser.uid;
      let active = true;
      lastSeenNotifIdRef.current = null;

      // Instant hydration from local cache to avoid unnecessary loading screens
      const cachedProfile = loadCachedUserProfile(uid);
      if (cachedProfile) {
        setUserProfile(cachedProfile);
        setProfileReady(true);
      } else {
        setProfileReady(false);
      }

      const cachedSettings = loadLocalUserSettings(uid);
      setSettings(cachedSettings);

      const initialDraft = createInitialThread(cachedSettings.language);
      setThreads([initialDraft]);

      let savedActiveId = "";
      try {
        savedActiveId = localStorage.getItem(getUserActiveThreadKey(uid)) || "";
      } catch {
        savedActiveId = "";
      }
      setActiveThreadId(savedActiveId || initialDraft.id);

      void syncUserProfile(firebaseUser)
        .then((synced) => {
          if (!active) return;
          setUserProfile(synced);
          saveCachedUserProfile(synced);
          setProfileReady(true);
          void seedInitialNotificationsInFirestore(uid, cachedSettings.language).catch(
            () => {}
          );
        })
        .catch((err) => {
          console.error("Failed to sync user profile:", err);
          if (!active) return;
          const fallbackProfile: UserProfileData = cachedProfile || {
            uid,
            displayName: firebaseUser.displayName || "NOVA User",
            email: firebaseUser.email || undefined,
            photoUrl: firebaseUser.photoURL || undefined,
            authProvider: detectAuthProvider(firebaseUser),
            onboardingCompleted: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setUserProfile(fallbackProfile);
          setProfileReady(true);
        });

      const unsubProfile = subscribeToUserProfile(
        uid,
        (profile) => {
          setUserProfile(profile);
          saveCachedUserProfile(profile);
          setProfileReady(true);
        },
        (err) => console.error("Profile subscription error:", err)
      );

      const unsubSettings = subscribeToUserSettings(
        uid,
        (remoteSettings) => {
          setSettings(remoteSettings);
          saveLocalUserSettings(remoteSettings, uid);
        },
        (err) => console.error("Settings subscription error:", err)
      );

      const unsubNotifications = subscribeToNotifications(
        uid,
        (items) => {
          setNotifications(items);
          const newestUnread = items.find((n) => !n.read);
          if (
            newestUnread &&
            lastSeenNotifIdRef.current !== null &&
            newestUnread.id !== lastSeenNotifIdRef.current &&
            settingsRef.current.notificationsEnabled
          ) {
            setToastNotif(newestUnread);
            if (settingsRef.current.soundEnabled) {
              playSubtleSound("notify");
            }
          }
          lastSeenNotifIdRef.current = newestUnread?.id || "";
        },
        (err) => console.error("Notifications subscription error:", err)
      );

      const unsubConversations = subscribeToUserConversations(
        uid,
        (remoteThreads) => {
          setThreads((current) => {
            const currentMap = new Map(current.map((item) => [item.id, item]));
            const remoteIds = new Set(remoteThreads.map((r) => r.id));

            const mergedRemote = remoteThreads.map((remote) => {
              const existing = currentMap.get(remote.id);
              return {
                ...remote,
                messages: existing ? existing.messages : [],
              };
            });

            const localDrafts = current.filter(
              (item) =>
                !remoteIds.has(item.id) &&
                (!item.isPersisted || item.messages.length > 0)
            );

            const combined = [...localDrafts, ...mergedRemote];
            if (combined.length === 0) {
              return [createInitialThread(langRef.current)];
            }
            return combined;
          });
        },
        (err) => console.error("Conversations subscription error:", err)
      );

      return () => {
        active = false;
        unsubProfile();
        unsubSettings();
        unsubNotifications();
        unsubConversations();
      };
    }
  }, [authReady, firebaseUser, isLocalGuest]);

  // Subscribe to messages for the active Firestore conversation
  const activeThread = threads.find((th) => th.id === activeThreadId);
  const activeThreadPersisted = Boolean(activeThread?.isPersisted);

  useEffect(() => {
    if (!firebaseUser || !activeThreadId || !activeThreadPersisted) return;

    const uid = firebaseUser.uid;
    const targetThreadId = activeThreadId;

    const unsubMessages = subscribeToConversationMessages(
      uid,
      targetThreadId,
      (remoteMsgs) => {
        for (const rm of remoteMsgs) {
          pendingMessageIdsRef.current.delete(rm.id);
        }

        setThreads((current) =>
          current.map((th) => {
            if (th.id !== targetThreadId) return th;
            const remoteIds = new Set(remoteMsgs.map((m) => m.id));
            const optimisticPending = th.messages.filter(
              (m) =>
                !remoteIds.has(m.id) &&
                (m.text === "" || pendingMessageIdsRef.current.has(m.id))
            );
            return {
              ...th,
              messages: [...remoteMsgs, ...optimisticPending],
            };
          })
        );
      },
      (err) => console.error("Messages subscription error:", err)
    );

    return () => unsubMessages();
  }, [firebaseUser, activeThreadId, activeThreadPersisted]);

  // Ensure activeThreadId always resolves to a valid thread
  useEffect(() => {
    if (threads.length > 0 && !threads.some((th) => th.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  // Persist active thread ID per user or guest
  useEffect(() => {
    if (!activeThreadId) return;
    if (firebaseUser) {
      try {
        localStorage.setItem(getUserActiveThreadKey(firebaseUser.uid), activeThreadId);
      } catch {
        // ignore
      }
    } else if (isLocalGuest) {
      saveActiveThreadId(activeThreadId);
    }
  }, [activeThreadId, firebaseUser, isLocalGuest]);

  // Persist local guest threads automatically
  useEffect(() => {
    if (!firebaseUser && isLocalGuest && settings.autoSaveHistory && threads.length > 0) {
      void saveThreadsToPersistentStore(threads);
    }
  }, [threads, firebaseUser, isLocalGuest, settings.autoSaveHistory]);

  // Auto-dismiss in-app toast banner
  useEffect(() => {
    if (!toastNotif) return;
    const timer = setTimeout(() => setToastNotif(null), 4000);
    return () => clearTimeout(timer);
  }, [toastNotif]);

  const handleUpdateSettings = useCallback(
    (patch: Partial<UserSettingsData>) => {
      if (patch.language) {
        saveManualLanguagePreference(patch.language);
      }
      setSettings((prev) => {
        const next: UserSettingsData = { ...DEFAULT_USER_SETTINGS, ...prev, ...patch };
        if (firebaseUser) {
          saveLocalUserSettings(next, firebaseUser.uid);
          void saveUserSettingsInFirestore(firebaseUser.uid, next).catch((err) => {
            console.error("Failed to save settings:", err);
          });
        } else {
          saveLocalUserSettings(next, "guest");
        }
        return next;
      });
    },
    [firebaseUser]
  );

  const handleContinueLocalGuest = () => {
    try {
      localStorage.setItem(LOCAL_GUEST_KEY, "1");
    } catch {
      // ignore
    }
    setIsLocalGuest(true);
  };

  const pushAccountNotification = useCallback(
    async (title: string, body: string) => {
      if (!settingsRef.current.notificationsEnabled || !settingsRef.current.accountAlerts) {
        return;
      }
      if (firebaseUser) {
        await createNotificationInFirestore(firebaseUser.uid, {
          title,
          body,
          category: "account",
        }).catch(() => {});
      } else if (isLocalGuest) {
        const newItem: AppNotification = {
          id: `notif_${Date.now()}`,
          title,
          body,
          category: "account",
          read: false,
          createdAt: Date.now(),
        };
        setNotifications((prev) => {
          const updated = [newItem, ...prev];
          saveLocalGuestNotifications(updated);
          return updated;
        });
        setToastNotif(newItem);
      }
    },
    [firebaseUser, isLocalGuest]
  );

  const handleCompleteOnboarding = async (name: string) => {
    const cleanName = name.trim().slice(0, 100);
    if (!cleanName) return;

    if (firebaseUser) {
      await updateUserProfileInFirestore(firebaseUser.uid, {
        displayName: cleanName,
        onboardingCompleted: true,
      });
      if (!firebaseUser.isAnonymous) {
        await updateProfile(firebaseUser, { displayName: cleanName }).catch(() => {});
      }
      setUserProfile((prev) => {
        if (!prev) return null;
        const next = { ...prev, displayName: cleanName, onboardingCompleted: true };
        saveCachedUserProfile(next);
        return next;
      });
      await seedInitialNotificationsInFirestore(firebaseUser.uid, lang).catch(() => {});
    } else if (isLocalGuest) {
      const updated: UserProfileData = {
        ...(userProfile || loadLocalGuestProfile()),
        displayName: cleanName,
        onboardingCompleted: true,
        updatedAt: Date.now(),
      };
      saveLocalGuestProfile(updated);
      setUserProfile(updated);
    }
  };

  const handleUpdateProfile = async (updates: {
    displayName?: string;
    photoUrl?: string;
  }) => {
    if (firebaseUser) {
      await updateUserProfileInFirestore(firebaseUser.uid, updates);
      if (updates.displayName && !firebaseUser.isAnonymous) {
        await updateProfile(firebaseUser, {
          displayName: updates.displayName,
        }).catch(() => {});
      }
      setUserProfile((prev) => {
        if (!prev) return null;
        const next = {
          ...prev,
          ...(updates.displayName ? { displayName: updates.displayName } : {}),
          ...(updates.photoUrl !== undefined ? { photoUrl: updates.photoUrl } : {}),
          updatedAt: Date.now(),
        };
        saveCachedUserProfile(next);
        return next;
      });
      void pushAccountNotification(
        lang === "ar" ? "تم تحديث الملف الشخصي" : "Profile Updated",
        lang === "ar"
          ? "تم حفظ تغييرات اسمك أو صورتك في حسابك بنجاح."
          : "Your profile details have been saved to your account."
      );
    } else if (isLocalGuest) {
      const current = userProfile || loadLocalGuestProfile();
      const updated: UserProfileData = {
        ...current,
        ...(updates.displayName ? { displayName: updates.displayName } : {}),
        ...(updates.photoUrl !== undefined ? { photoUrl: updates.photoUrl } : {}),
        updatedAt: Date.now(),
      };
      saveLocalGuestProfile(updated);
      setUserProfile(updated);
      void pushAccountNotification(
        lang === "ar" ? "تم تحديث الملف الشخصي" : "Profile Updated",
        lang === "ar"
          ? "تم حفظ بيانات ملفك الشخصي."
          : "Your guest profile changes were saved."
      );
    }
  };

  const handleSignOut = async () => {
    pendingMessageIdsRef.current.clear();
    try {
      localStorage.removeItem(LOCAL_GUEST_KEY);
    } catch {
      // ignore
    }
    setMenuOpen(false);
    setIsLocalGuest(false);
    setUserProfile(null);
    setNotifications([]);
    setThreads([]);
    setActiveThreadId("");
    if (firebaseUser) {
      await signOut(auth);
    }
  };

  const handleRequestSignIn = async () => {
    pendingMessageIdsRef.current.clear();
    try {
      localStorage.removeItem(LOCAL_GUEST_KEY);
    } catch {
      // ignore
    }
    setMenuOpen(false);
    setIsLocalGuest(false);
    setUserProfile(null);
    setNotifications([]);
    setThreads([]);
    setActiveThreadId("");
    if (firebaseUser?.isAnonymous) {
      await signOut(auth);
    }
  };

  const handleClearAllHistory = async () => {
    const fresh = createInitialThread(lang);
    setThreads([fresh]);
    setActiveThreadId(fresh.id);

    if (firebaseUser) {
      await clearAllConversationsInFirestore(firebaseUser.uid);
    } else if (isLocalGuest) {
      await saveThreadsToPersistentStore([fresh]);
    }
  };

  const handleDeleteAccount = async (): Promise<{
    ok: boolean;
    needsReauth?: boolean;
  }> => {
    if (!firebaseUser && isLocalGuest) {
      clearAllLocalGuestData();
      setMenuOpen(false);
      setIsLocalGuest(false);
      setUserProfile(null);
      setNotifications([]);
      setThreads([]);
      setActiveThreadId("");
      return { ok: true };
    }

    if (firebaseUser) {
      const uid = firebaseUser.uid;
      try {
        await deleteEntireAccountDataInFirestore(uid);
        try {
          localStorage.removeItem(getUserActiveThreadKey(uid));
          localStorage.removeItem(`nova_ai_seeded_notifs_${uid}`);
          localStorage.removeItem(`nova_ai_guest_settings_${uid}`);
          localStorage.removeItem(`nova_ai_cached_profile_${uid}`);
        } catch {
          // ignore
        }
        await deleteUser(firebaseUser);
        setMenuOpen(false);
        setUserProfile(null);
        setNotifications([]);
        setThreads([]);
        setActiveThreadId("");
        return { ok: true };
      } catch (err) {
        const code =
          typeof err === "object" && err !== null && "code" in err
            ? String((err as { code: unknown }).code)
            : "";
        if (code === "auth/requires-recent-login") {
          return { ok: false, needsReauth: true };
        }
        return { ok: false };
      }
    }

    return { ok: false };
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (!firebaseUser && isLocalGuest) {
        saveLocalGuestNotifications(updated);
      }
      return updated;
    });
    if (firebaseUser) {
      void markNotificationReadInFirestore(firebaseUser.uid, id).catch(() => {});
    }
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      if (!firebaseUser && isLocalGuest) {
        saveLocalGuestNotifications(updated);
      }
      return updated;
    });
    if (firebaseUser) {
      void markAllNotificationsReadInFirestore(firebaseUser.uid).catch(() => {});
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    if (firebaseUser) {
      void clearNotificationsInFirestore(firebaseUser.uid).catch(() => {});
    } else if (isLocalGuest) {
      saveLocalGuestNotifications([]);
    }
  };

  const handleCreateThread = () => {
    const active = threads.find((item) => item.id === activeThreadId);
    if (active && active.messages.length === 0 && !active.isPersisted) {
      setActiveThreadId(active.id);
      return;
    }

    const existingEmpty = threads.find(
      (item) => item.messages.length === 0 && !item.isPersisted
    );
    if (existingEmpty) {
      const refreshed: ChatThread = {
        ...existingEmpty,
        title: t.chat.defaultThreadTitle,
        updatedAt: Date.now(),
      };
      setThreads((prev) => [
        refreshed,
        ...prev.filter((item) => item.id !== existingEmpty.id),
      ]);
      setActiveThreadId(existingEmpty.id);
      return;
    }

    const fresh = createInitialThread(lang);
    setThreads((prev) => [fresh, ...prev]);
    setActiveThreadId(fresh.id);
  };

  const handleRenameThread = (id: string, title: string) => {
    setThreads((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, title, customTitle: true, updatedAt: Date.now() }
          : item
      )
    );
    if (firebaseUser) {
      const target = threads.find((item) => item.id === id);
      if (target?.isPersisted) {
        void renameConversationInFirestore(firebaseUser.uid, id, title).catch((err) => {
          console.error("Failed to rename conversation:", err);
        });
      }
    }
  };

  const handleDeleteThread = (id: string) => {
    const target = threads.find((item) => item.id === id);
    setThreads((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length === 0) {
        const fresh = createInitialThread(lang);
        setActiveThreadId(fresh.id);
        return [fresh];
      }
      if (id === activeThreadId) {
        setActiveThreadId(filtered[0].id);
      }
      return filtered;
    });

    if (firebaseUser && target?.isPersisted) {
      void deleteConversationInFirestore(firebaseUser.uid, id).catch((err) => {
        console.error("Failed to delete conversation:", err);
      });
    }
  };

  const handleClearThread = (id: string) => {
    const target = threads.find((item) => item.id === id);
    setThreads((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              title: t.chat.defaultThreadTitle,
              customTitle: false,
              messages: [],
              updatedAt: Date.now(),
            }
          : item
      )
    );

    if (firebaseUser && target?.isPersisted) {
      void clearConversationMessagesInFirestore(
        firebaseUser.uid,
        id,
        t.chat.defaultThreadTitle
      ).catch((err) => {
        console.error("Failed to clear conversation:", err);
      });
    }
  };

  const handleUpdateThread = useCallback((updated: ChatThread) => {
    setThreads((prev) => {
      const exists = prev.some((item) => item.id === updated.id);
      if (!exists) {
        return [updated, ...prev];
      }
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });
  }, []);

  const handlePersistMessage = useCallback(
    (thread: ChatThread, message: ChatMessage) => {
      if (!firebaseUser || !message.text.trim()) return;
      const uid = firebaseUser.uid;
      pendingMessageIdsRef.current.add(message.id);

      writeQueueRef.current = writeQueueRef.current
        .then(() => persistConversationMessage(uid, thread, message))
        .catch((err) => {
          console.error("Failed to persist message:", err);
        })
        .finally(() => {
          pendingMessageIdsRef.current.delete(message.id);
        });
    },
    [firebaseUser]
  );

  // Brief minimal boot check only while Firebase Auth restores local persistence
  if (!authReady || ((firebaseUser || isLocalGuest) && !profileReady)) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[var(--nova-bg)]">
        <NovaLogo size={48} />
      </div>
    );
  }

  // Show Login / Sign-Up Screen when unauthenticated
  if (!firebaseUser && !isLocalGuest) {
    return (
      <AuthScreen
        t={t}
        onContinueLocalGuest={handleContinueLocalGuest}
      />
    );
  }

  // First-Time User Name Setup (shown only once before onboardingCompleted is true)
  if (userProfile && !userProfile.onboardingCompleted) {
    return (
      <OnboardingView
        t={t}
        initialName={userProfile.displayName}
        onComplete={handleCompleteOnboarding}
      />
    );
  }

  const isGuestSession = isLocalGuest || Boolean(firebaseUser?.isAnonymous);
  const resolvedProfile: UserProfileData = userProfile || {
    uid: firebaseUser?.uid || "guest",
    displayName: isGuestSession
      ? t.auth.guestLabel
      : firebaseUser?.displayName || t.auth.personalAccount,
    email: isGuestSession ? undefined : firebaseUser?.email || undefined,
    photoUrl: firebaseUser?.photoURL || undefined,
    authProvider: firebaseUser ? detectAuthProvider(firebaseUser) : "anonymous",
    onboardingCompleted: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--nova-bg)] text-[var(--nova-text)]">
      {/* Top Header Bar: Checkmark Brand + ONE Unified Top Menu Button */}
      <header className="shrink-0 border-b border-[var(--nova-border)] bg-[var(--nova-surface)] pt-safe">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <NovaLogo size={32} />
            <span className="font-display text-lg font-bold tracking-tight text-[var(--nova-text)]">
              {t.brand}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.menu.openMenu}
            className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-3.5 text-xs font-semibold text-[var(--nova-text)] transition-colors hover:bg-[var(--nova-accent-soft)] active:scale-[0.98] cursor-pointer"
          >
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">{t.menu.title}</span>
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--nova-accent)] px-1.5 text-[11px] font-bold text-[var(--nova-accent-fg)] tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* In-App Toast Banner */}
      {toastNotif && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4 pt-2">
          <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] p-3.5 shadow-lg">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--nova-text)]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--nova-text)]">
                {toastNotif.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-[var(--nova-text-muted)]">
                {toastNotif.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToastNotif(null)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--nova-text-muted)] hover:text-[var(--nova-text)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Central AI Chat Workspace */}
      <main className="flex min-h-0 flex-1 bg-[var(--nova-bg)]">
        <ChatView
          t={t}
          lang={lang}
          threads={threads}
          activeThreadId={activeThreadId}
          settings={settings}
          onSelectThread={setActiveThreadId}
          onCreateThread={handleCreateThread}
          onRenameThread={handleRenameThread}
          onDeleteThread={handleDeleteThread}
          onClearThread={handleClearThread}
          onUpdateThread={handleUpdateThread}
          onPersistMessage={handlePersistMessage}
        />
      </main>

      {/* ONE Unified Top Menu containing all Profile, Notifications, History, Settings, Sign Out & Delete Account */}
      <UnifiedTopMenu
        open={menuOpen}
        t={t}
        lang={lang}
        profile={resolvedProfile}
        settings={settings}
        notifications={notifications}
        threads={threads}
        activeThreadId={activeThreadId}
        isGuest={isGuestSession}
        onClose={() => setMenuOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onUpdateSettings={handleUpdateSettings}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onClearNotifications={handleClearNotifications}
        onSelectThread={setActiveThreadId}
        onCreateThread={handleCreateThread}
        onRenameThread={handleRenameThread}
        onDeleteThread={handleDeleteThread}
        onClearAllHistory={handleClearAllHistory}
        onSignOut={handleSignOut}
        onRequestSignIn={handleRequestSignIn}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
}
