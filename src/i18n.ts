import type { AccentColor, Language } from "./types";

export interface TranslationCopy {
  brand: string;
  langToggle: string;
  menu: {
    openMenu: string;
    closeMenu: string;
    backToMenu: string;
    title: string;
    profileAndAccount: string;
    profileDesc: string;
    notifications: string;
    notificationsDesc: string;
    chatHistory: string;
    chatHistoryDesc: string;
    settings: string;
    settingsDesc: string;
    appearance: string;
    appearanceDesc: string;
    language: string;
    languageDesc: string;
    privacy: string;
    privacyDesc: string;
    soundVibration: string;
    soundVibrationDesc: string;
    signOut: string;
    deleteAccount: string;
  };
  auth: {
    headline: string;
    subtitle: string;
    continueApple: string;
    continueGoogle: string;
    continueEmail: string;
    continueGuest: string;
    orDivider: string;
    signInTab: string;
    signUpTab: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    signInAction: string;
    createAccountAction: string;
    backToOptions: string;
    privacyNote: string;
    guestLabel: string;
    guestAccountLabel: string;
    personalAccount: string;
    signOut: string;
    signIn: string;
    retry: string;
    loginError: string;
    errors: {
      invalidEmail: string;
      shortPassword: string;
      missingName: string;
    };
  };
  onboarding: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    continueBtn: string;
    emptyNameError: string;
  };
  profile: {
    title: string;
    subtitle: string;
    displayName: string;
    emailOrAccount: string;
    loginProvider: string;
    accountCreated: string;
    accountType: string;
    editProfile: string;
    changePhoto: string;
    removePhoto: string;
    saveChanges: string;
    cancel: string;
    savedSuccess: string;
    guestType: string;
    registeredType: string;
    providerLabels: {
      google: string;
      apple: string;
      email: string;
      anonymous: string;
    };
    presetAvatarsLabel: string;
    uploadPhotoLabel: string;
  };
  settings: {
    title: string;
    subtitle: string;
    autoSavedHint: string;
    sections: {
      myAccount: string;
      profile: string;
      appearance: string;
      language: string;
      chatPreferences: string;
      notifications: string;
      soundVibration: string;
      privacy: string;
      chatHistory: string;
    };
    savedConversationsCount: string;
    openHistoryBtn: string;
    openNotifsBtn: string;
    displayNameLabel: string;
    saveName: string;
    changePhoto: string;
    themeLabel: string;
    darkTheme: string;
    lightTheme: string;
    accentColorLabel: string;
    accentNames: Record<AccentColor, string>;
    languageLabel: string;
    englishLang: string;
    arabicLang: string;
    chatDensityLabel: string;
    comfortable: string;
    compact: string;
    fontSizeLabel: string;
    fontSizes: {
      sm: string;
      md: string;
      lg: string;
    };
    typingSpeedLabel: string;
    typingSpeeds: {
      fast: string;
      natural: string;
      instant: string;
    };
    inAppNotifs: string;
    inAppNotifsDesc: string;
    featureNotifs: string;
    featureNotifsDesc: string;
    accountNotifs: string;
    accountNotifsDesc: string;
    hapticsLabel: string;
    hapticsDesc: string;
    soundLabel: string;
    soundDesc: string;
    autoSaveLabel: string;
    autoSaveDesc: string;
    hidePreviewsLabel: string;
    hidePreviewsDesc: string;
    exportHistory: string;
    clearAllHistory: string;
    clearAllConfirmTitle: string;
    clearAllConfirmBody: string;
    confirmClear: string;
    accountInfoLabel: string;
    freeForeverNote: string;
    signOutBtn: string;
    deleteAccountBtn: string;
    deleteAccountTitle: string;
    deleteAccountBody: string;
    confirmDeleteAccount: string;
    reauthNeededError: string;
    cancel: string;
  };
  notifications: {
    title: string;
    subtitle: string;
    markAllRead: string;
    clearAll: string;
    markRead: string;
    emptyTitle: string;
    emptyDesc: string;
    allTab: string;
    unreadTab: string;
    categories: {
      feature: string;
      account: string;
      system: string;
    };
    preferencesLink: string;
  };
  chat: {
    newChat: string;
    historyTitle: string;
    searchPlaceholder: string;
    noHistoryMatch: string;
    emptyHistory: string;
    previewHidden: string;
    groups: {
      today: string;
      yesterday: string;
      previous7Days: string;
      older: string;
    };
    welcomeHeadline: string;
    welcomeArabicTag: string;
    welcomeDesc: string;
    starters: string[];
    placeholder: string;
    send: string;
    stop: string;
    copy: string;
    copied: string;
    renameChat: string;
    saveName: string;
    cancelRename: string;
    deleteChat: string;
    clearChat: string;
    thinking: string;
    dismiss: string;
    defaultThreadTitle: string;
    savedNotice: string;
    voice: {
      micLabel: string;
      listening: string;
      transcribing: string;
      stopAndUse: string;
      cancel: string;
      switchToArabic: string;
      switchToEnglish: string;
      langAr: string;
      langEn: string;
      permissionDenied: string;
      unavailable: string;
      noSpeechDetected: string;
    };
  };
}

export const translations: Record<Language, TranslationCopy> = {
  en: {
    brand: "NOVA AI",
    langToggle: "عربي",
    menu: {
      openMenu: "Open menu",
      closeMenu: "Close",
      backToMenu: "Menu",
      title: "Menu",
      profileAndAccount: "Profile & Account Info",
      profileDesc: "Name, picture, email & sign-in method",
      notifications: "Notifications",
      notificationsDesc: "Announcements, alerts & unread updates",
      chatHistory: "Chat History",
      chatHistoryDesc: "Search, reopen & manage conversations",
      settings: "Settings",
      settingsDesc: "All preferences & account controls",
      appearance: "Appearance & Colors",
      appearanceDesc: "Dark or Light mode & accent palette",
      language: "Language",
      languageDesc: "English or العربية",
      privacy: "Privacy & Data",
      privacyDesc: "Auto-save, hide previews & export",
      soundVibration: "Sound & Vibration",
      soundVibrationDesc: "Audio chimes & haptic feedback",
      signOut: "Sign Out",
      deleteAccount: "Delete Account",
    },
    auth: {
      headline: "Welcome to NOVA AI",
      subtitle:
        "Private conversations, instant answers, and personalized history across every session.",
      continueApple: "Continue with Apple",
      continueGoogle: "Continue with Google",
      continueEmail: "Continue with Email",
      continueGuest: "Continue as Guest",
      orDivider: "or",
      signInTab: "Sign In",
      signUpTab: "Create Account",
      nameLabel: "Full Name",
      namePlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "At least 6 characters",
      signInAction: "Sign In",
      createAccountAction: "Create Account",
      backToOptions: "All sign-in options",
      privacyNote:
        "Completely free forever. Your conversations stay private to your own account.",
      guestLabel: "Guest",
      guestAccountLabel: "Guest Account",
      personalAccount: "Registered Account",
      signOut: "Sign Out",
      signIn: "Sign In",
      retry: "Retry",
      loginError: "Something went wrong. Please try again.",
      errors: {
        invalidEmail: "Please enter a valid email address.",
        shortPassword: "Password must be at least 6 characters.",
        missingName: "Please enter your name to create an account.",
      },
    },
    onboarding: {
      title: "Welcome! What's your name?",
      subtitle:
        "Let's personalize your NOVA AI profile. You can update your name anytime in Settings.",
      nameLabel: "Your Name",
      namePlaceholder: "Enter your name",
      continueBtn: "Get Started",
      emptyNameError: "Please enter your name to continue.",
    },
    profile: {
      title: "Profile & Account",
      subtitle: "Manage your personal identity and account overview.",
      displayName: "Display Name",
      emailOrAccount: "Email Address",
      loginProvider: "Login Provider",
      accountCreated: "Member Since",
      accountType: "Account Type",
      editProfile: "Edit Profile",
      changePhoto: "Change Picture",
      removePhoto: "Reset Picture",
      saveChanges: "Save Profile",
      cancel: "Cancel",
      savedSuccess: "Profile updated",
      guestType: "Guest",
      registeredType: "Registered",
      providerLabels: {
        google: "Google",
        apple: "Apple",
        email: "Email",
        anonymous: "Guest",
      },
      presetAvatarsLabel: "Or pick a monogram style",
      uploadPhotoLabel: "Upload Photo",
    },
    settings: {
      title: "Settings",
      subtitle: "Customize appearance, notifications, privacy, and account preferences.",
      autoSavedHint: "Saved automatically",
      sections: {
        myAccount: "My Account",
        profile: "Profile",
        appearance: "Appearance",
        language: "Language",
        chatPreferences: "Chat Preferences",
        notifications: "Notifications",
        soundVibration: "Sound and Vibration",
        privacy: "Privacy",
        chatHistory: "Chat History",
      },
      savedConversationsCount: "Saved conversations",
      openHistoryBtn: "Manage Chat History",
      openNotifsBtn: "Open Notification Center",
      displayNameLabel: "Display Name",
      saveName: "Save Name",
      changePhoto: "Change Profile Picture",
      themeLabel: "Theme Mode",
      darkTheme: "Dark (Pure Black)",
      lightTheme: "Light",
      accentColorLabel: "Accent Color",
      accentNames: {
        mono: "Monochrome",
        blue: "Sapphire",
        emerald: "Emerald",
        amber: "Amber",
        rose: "Crimson",
        violet: "Violet",
      },
      languageLabel: "Language",
      englishLang: "English",
      arabicLang: "العربية",
      chatDensityLabel: "Message Spacing",
      comfortable: "Comfortable",
      compact: "Compact",
      fontSizeLabel: "Text Size",
      fontSizes: {
        sm: "Small",
        md: "Standard",
        lg: "Large",
      },
      typingSpeedLabel: "Response Typing Animation",
      typingSpeeds: {
        fast: "Fast",
        natural: "Natural",
        instant: "Instant",
      },
      inAppNotifs: "In-App Notifications",
      inAppNotifsDesc: "Show important alerts inside NOVA AI.",
      featureNotifs: "New Feature Announcements",
      featureNotifsDesc: "Learn when new tools and improvements arrive.",
      accountNotifs: "Account & Security Alerts",
      accountNotifsDesc: "Updates about profile edits and session security.",
      hapticsLabel: "Haptic Vibration",
      hapticsDesc: "Subtle vibration when NOVA finishes replying.",
      soundLabel: "Sound Effects",
      soundDesc: "Gentle audio chime for completed replies and alerts.",
      autoSaveLabel: "Auto-Save Conversations",
      autoSaveDesc: "Automatically save new chats to your private history.",
      hidePreviewsLabel: "Hide History Previews",
      hidePreviewsDesc: "Keep conversation snippets hidden in the list.",
      exportHistory: "Export Chats (JSON)",
      clearAllHistory: "Clear All Chats",
      clearAllConfirmTitle: "Clear all conversations?",
      clearAllConfirmBody:
        "This permanently deletes all saved conversations in this account.",
      confirmClear: "Delete All Chats",
      accountInfoLabel: "Account Overview",
      freeForeverNote: "NOVA AI is 100% free forever with all features unlocked.",
      signOutBtn: "Sign Out",
      deleteAccountBtn: "Delete Account",
      deleteAccountTitle: "Delete your account?",
      deleteAccountBody:
        "This permanently removes your profile, settings, notifications, and every conversation. This cannot be undone.",
      confirmDeleteAccount: "Delete Forever",
      reauthNeededError:
        "For security, please sign out and sign back in right before deleting your account.",
      cancel: "Cancel",
    },
    notifications: {
      title: "Notifications",
      subtitle: "Feature updates, account notices, and preferences.",
      markAllRead: "Mark all read",
      clearAll: "Clear history",
      markRead: "Mark read",
      emptyTitle: "No notifications yet",
      emptyDesc: "Feature announcements and important account updates appear here.",
      allTab: "All",
      unreadTab: "Unread",
      categories: {
        feature: "New Feature",
        account: "Account",
        system: "System",
      },
      preferencesLink: "Notification Preferences",
    },
    chat: {
      newChat: "New Chat",
      historyTitle: "Chat History",
      searchPlaceholder: "Search chats...",
      noHistoryMatch: "No conversations match your search.",
      emptyHistory: "Saved conversations appear here.",
      previewHidden: "Private Conversation",
      groups: {
        today: "Today",
        yesterday: "Yesterday",
        previous7Days: "Previous 7 Days",
        older: "Older",
      },
      welcomeHeadline: "Ask NOVA AI",
      welcomeArabicTag: "اسأل NOVA AI",
      welcomeDesc:
        "Ask anything—everyday questions, creative writing, or clean code—all in one place.",
      starters: [
        "Explain quantum computing in simple everyday analogies.",
        "اكتب خطة عملية لتعلم تطوير التطبيقات خلال ٣٠ يوماً.",
        "Write a clean TypeScript helper with a short explanation.",
        "Who created this app?",
      ],
      placeholder: "Ask NOVA AI...",
      send: "Send",
      stop: "Stop",
      copy: "Copy",
      copied: "Copied",
      renameChat: "Rename",
      saveName: "Save",
      cancelRename: "Cancel",
      deleteChat: "Delete",
      clearChat: "Clear",
      thinking: "Thinking...",
      dismiss: "Dismiss",
      defaultThreadTitle: "New Chat",
      savedNotice: "Saved",
      voice: {
        micLabel: "Voice input",
        listening: "Recording...",
        transcribing: "Transcribing speech...",
        stopAndUse: "Done",
        cancel: "Cancel",
        switchToArabic: "العربية",
        switchToEnglish: "EN",
        langAr: "Arabic",
        langEn: "English",
        permissionDenied:
          "Microphone access was denied. Please enable microphone permission in your browser settings.",
        unavailable:
          "Voice recording is unavailable on this device or browser.",
        noSpeechDetected: "No clear speech was detected. Please try again.",
      },
    },
  },
  ar: {
    brand: "NOVA AI",
    langToggle: "EN",
    menu: {
      openMenu: "فتح القائمة",
      closeMenu: "إغلاق",
      backToMenu: "القائمة",
      title: "القائمة",
      profileAndAccount: "الملف الشخصي ومعلومات الحساب",
      profileDesc: "الاسم، الصورة، البريد وطريقة الدخول",
      notifications: "الإشعارات",
      notificationsDesc: "الميزات الجديدة وتنبيهات الحساب",
      chatHistory: "سجل المحادثات",
      chatHistoryDesc: "بحث وإعادة فتح وإدارة المحادثات",
      settings: "الإعدادات",
      settingsDesc: "كل التفضيلات وإدارة الحساب",
      appearance: "المظهر والألوان",
      appearanceDesc: "الوضع الداكن والفاتح ولون التطبيق",
      language: "اللغة",
      languageDesc: "العربية أو English",
      privacy: "الخصوصية والبيانات",
      privacyDesc: "الحفظ التلقائي، إخفاء العناوين والتصدير",
      soundVibration: "الصوت والاهتزاز",
      soundVibrationDesc: "المؤثرات الصوتية والاهتزاز التفاعلي",
      signOut: "تسجيل الخروج",
      deleteAccount: "حذف الحساب",
    },
    auth: {
      headline: "هلا بك في NOVA AI",
      subtitle:
        "محادثات خاصة، ردود سريعة، وسجل محفوظ يرجع معك كل ما تفتح التطبيق.",
      continueApple: "المتابعة عبر Apple",
      continueGoogle: "المتابعة عبر Google",
      continueEmail: "المتابعة بالبريد الإلكتروني",
      continueGuest: "الدخول كضيف",
      orDivider: "أو",
      signInTab: "تسجيل الدخول",
      signUpTab: "حساب جديد",
      nameLabel: "الاسم",
      namePlaceholder: "اكتب اسمك",
      emailLabel: "البريد الإلكتروني",
      emailPlaceholder: "name@example.com",
      passwordLabel: "كلمة المرور",
      passwordPlaceholder: "٦ أحرف على الأقل",
      signInAction: "تسجيل الدخول",
      createAccountAction: "إنشاء حساب",
      backToOptions: "كل خيارات الدخول",
      privacyNote: "التطبيق مجاني بالكامل للأبد، ومحادثاتك خاصة بحسابك فقط.",
      guestLabel: "ضيف",
      guestAccountLabel: "Guest Account",
      personalAccount: "حساب مسجل",
      signOut: "تسجيل الخروج",
      signIn: "تسجيل الدخول",
      retry: "إعادة المحاولة",
      loginError: "حدث خطأ ما، حاول مرة أخرى.",
      errors: {
        invalidEmail: "تأكد من كتابة البريد الإلكتروني بشكل صحيح.",
        shortPassword: "كلمة المرور لازم تكون ٦ أحرف أو أكثر.",
        missingName: "اكتب اسمك عشان ننشئ لك الحساب.",
      },
    },
    onboarding: {
      title: "هلا بك! وش اسمك؟",
      subtitle:
        "خلنا نجهز ملفك الشخصي في NOVA AI. تقدر تغير اسمك بأي وقت من الإعدادات.",
      nameLabel: "الاسم",
      namePlaceholder: "اكتب اسمك هنا",
      continueBtn: "ابدأ الحين",
      emptyNameError: "فضلاً اكتب اسمك عشان نكمل.",
    },
    profile: {
      title: "الملف الشخصي والحساب",
      subtitle: "بيانات حسابك الشخصي وإدارة صورتك واسمك.",
      displayName: "الاسم",
      emailOrAccount: "البريد الإلكتروني",
      loginProvider: "طريقة الدخول",
      accountCreated: "تاريخ إنشاء الحساب",
      accountType: "نوع الحساب",
      editProfile: "تعديل الملف",
      changePhoto: "تغيير الصورة",
      removePhoto: "إزالة الصورة",
      saveChanges: "حفظ التغييرات",
      cancel: "إلغاء",
      savedSuccess: "تم تحديث الملف الشخصي",
      guestType: "ضيف (Guest)",
      registeredType: "مسجل (Registered)",
      providerLabels: {
        google: "Google",
        apple: "Apple",
        email: "Email",
        anonymous: "ضيف",
      },
      presetAvatarsLabel: "أو اختر نمط صورة",
      uploadPhotoLabel: "رفع صورة",
    },
    settings: {
      title: "الإعدادات",
      subtitle: "تحكم في المظهر، الألوان، الإشعارات، الخصوصية، وإدارة حسابك.",
      autoSavedHint: "الحفظ تلقائي",
      sections: {
        myAccount: "حسابي",
        profile: "الملف الشخصي",
        appearance: "المظهر",
        language: "اللغة",
        chatPreferences: "تفضيلات المحادثة",
        notifications: "الإشعارات",
        soundVibration: "الصوت والاهتزاز",
        privacy: "الخصوصية",
        chatHistory: "سجل المحادثات",
      },
      savedConversationsCount: "المحادثات المحفوظة",
      openHistoryBtn: "عرض وإدارة سجل المحادثات",
      openNotifsBtn: "فتح مركز الإشعارات",
      displayNameLabel: "الاسم",
      saveName: "حفظ الاسم",
      changePhoto: "تغيير صورة الملف الشخصي",
      themeLabel: "الوضع",
      darkTheme: "داكن (أسود نقي)",
      lightTheme: "فاتح",
      accentColorLabel: "لون التطبيق المفضل",
      accentNames: {
        mono: "أبيض وأسود",
        blue: "أزرق",
        emerald: "أخضر",
        amber: "ذهبي",
        rose: "عنابي",
        violet: "بنفسجي",
      },
      languageLabel: "اللغة",
      englishLang: "English",
      arabicLang: "العربية",
      chatDensityLabel: "تباعد الرسائل",
      comfortable: "مريح",
      compact: "مكثف",
      fontSizeLabel: "حجم الخط",
      fontSizes: {
        sm: "صغير",
        md: "متوسط",
        lg: "كبير",
      },
      typingSpeedLabel: "سرعة كتابة الردود",
      typingSpeeds: {
        fast: "سريع",
        natural: "طبيعي",
        instant: "فوري",
      },
      inAppNotifs: "إشعارات داخل التطبيق",
      inAppNotifsDesc: "عرض التنبيهات المهمة داخل NOVA AI.",
      featureNotifs: "إعلانات الميزات الجديدة",
      featureNotifsDesc: "توصلك أخبار التحديثات والميزات الجديدة.",
      accountNotifs: "تنبيهات الحساب والأمان",
      accountNotifsDesc: "إشعارات تحديث الملف الشخصي وحالة الحساب.",
      hapticsLabel: "الاهتزاز (Haptic Feedback)",
      hapticsDesc: "اهتزاز خفيف أول ما يخلص NOVA من الرد.",
      soundLabel: "المؤثرات الصوتية",
      soundDesc: "صوت هادي عند انتهاء الرد أو وصول تنبيه.",
      autoSaveLabel: "حفظ المحادثات تلقائياً",
      autoSaveDesc: "حفظ كل محادثة جديدة في السجل الخاص بك تلقائياً.",
      hidePreviewsLabel: "إخفاء عناوين المحادثات",
      hidePreviewsDesc: "إخفاء أسماء المحادثات في القائمة لمزيد من الخصوصية.",
      exportHistory: "تصدير المحادثات (JSON)",
      clearAllHistory: "مسح كل المحادثات",
      clearAllConfirmTitle: "مسح جميع المحادثات؟",
      clearAllConfirmBody: "هذا الإجراء يحذف كل المحادثات المحفوظة في هذا الحساب نهائياً.",
      confirmClear: "حذف الكل",
      accountInfoLabel: "معلومات الحساب",
      freeForeverNote: "NOVA AI مجاني بالكامل للأبد — كل الميزات مفتوحة للجميع.",
      signOutBtn: "تسجيل الخروج",
      deleteAccountBtn: "حذف الحساب نهائياً",
      deleteAccountTitle: "حذف الحساب بالكامل؟",
      deleteAccountBody:
        "بيتم حذف ملفك الشخصي وإعداداتك وإشعاراتك وكل محادثاتك نهائياً. ما تقدر تتراجع عن هذا القرار.",
      confirmDeleteAccount: "تأكيد الحذف النهائي",
      reauthNeededError:
        "للأمان، فضلاً سجل خروج وادخل مرة ثانية قبل حذف الحساب.",
      cancel: "إلغاء",
    },
    notifications: {
      title: "الإشعارات",
      subtitle: "تحديثات الميزات، تنبيهات الحساب، وتفضيلات الإشعارات.",
      markAllRead: "تحديد الكل كمقروء",
      clearAll: "مسح السجل",
      markRead: "مقروء",
      emptyTitle: "ما فيه إشعارات حالياً",
      emptyDesc: "إعلانات الميزات الجديدة وتنبيهات الحساب بتظهر هنا.",
      allTab: "الكل",
      unreadTab: "غير مقروء",
      categories: {
        feature: "ميزة جديدة",
        account: "الحساب",
        system: "النظام",
      },
      preferencesLink: "تفضيلات الإشعارات",
    },
    chat: {
      newChat: "محادثة جديدة",
      historyTitle: "سجل المحادثات",
      searchPlaceholder: "ابحث في المحادثات...",
      noHistoryMatch: "ما فيه محادثات تطابق بحثك.",
      emptyHistory: "المحادثات المحفوظة بتظهر هنا.",
      previewHidden: "محادثة خاصة",
      groups: {
        today: "اليوم",
        yesterday: "أمس",
        previous7Days: "آخر ٧ أيام",
        older: "أقدم",
      },
      welcomeHeadline: "اسأل NOVA AI",
      welcomeArabicTag: "اسأل NOVA AI",
      welcomeDesc:
        "اسألني عن أي شي—سوالف، أفكار إبداعية، أو برمجة—كلها في مكان واحد.",
      starters: [
        "اشرح لي الذكاء الاصطناعي ببساطة وبأمثلة من حياتنا اليومية.",
        "سولف معي وأعطني خطة سهلة أتعلم فيها مهارة جديدة بـ ٣٠ يوم.",
        "اكتب لي كود بسيط ومرتب مع شرح سريع لطريقة عمله.",
        "مين اللي صنع هذا التطبيق؟",
      ],
      placeholder: "اسأل NOVA AI...",
      send: "إرسال",
      stop: "إيقاف",
      copy: "نسخ",
      copied: "تم النسخ",
      renameChat: "تعديل الاسم",
      saveName: "حفظ",
      cancelRename: "إلغاء",
      deleteChat: "حذف",
      clearChat: "مسح",
      thinking: "يفكر...",
      dismiss: "إغلاق",
      defaultThreadTitle: "محادثة جديدة",
      savedNotice: "محفوظ",
      voice: {
        micLabel: "التحدث بالمايكروفون",
        listening: "جاري التسجيل...",
        transcribing: "جاري تحويل الصوت لنص...",
        stopAndUse: "تم",
        cancel: "إلغاء",
        switchToArabic: "العربية",
        switchToEnglish: "EN",
        langAr: "العربية",
        langEn: "English",
        permissionDenied:
          "تم رفض إذن المايكروفون. فضلاً اسمح باستخدام المايكروفون من إعدادات المتصفح.",
        unavailable:
          "التسجيل الصوتي غير متاح في هذا المتصفح أو الجهاز.",
        noSpeechDetected: "ما سمعنا كلام واضح، جرب مرة ثانية.",
      },
    },
  },
};
