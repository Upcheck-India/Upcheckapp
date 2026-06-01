const settings = {
  // ── SettingsScreen ────────────────────────────────────────────────────────
  title: 'সেটিংস',
  language: 'ভাষা',
  languageDesc: 'আপনার পছন্দের অ্যাপের ভাষা বেছে নিন',
  appPreferences: 'অ্যাপের পছন্দ',
  offlineSync: 'অফলাইন সিঙ্ক',
  offlineSyncDesc: 'অফলাইন ব্যবহারের জন্য ডেটা ক্যাশ করুন',
  notifications: 'বিজ্ঞপ্তি',
  pushNotifications: 'পুশ বিজ্ঞপ্তি',
  pushNotificationsDesc: 'পানির মান ও খাওয়ানোর সতর্কতা',
  emailSummaries: 'ইমেইল সারসংক্ষেপ',
  emailSummariesDesc: 'সাপ্তাহিক কার্যকারিতার প্রতিবেদন',
  security: 'নিরাপত্তা',
  twoFactor: 'দ্বি-স্তরীয় প্রমাণীকরণ',
  about: 'Upcheck সম্পর্কে',
  privacyPolicy: 'গোপনীয়তা নীতি',
  termsOfService: 'সেবার শর্তাবলী',

  // ── ProfileScreen ─────────────────────────────────────────────────────────
  profile: 'প্রোফাইল',
  editProfile: 'প্রোফাইল সম্পাদনা',
  emailAddress: 'ইমেইল ঠিকানা',
  fullName: 'পুরো নাম',
  phoneNumber: 'ফোন নম্বর',
  memberSince: 'সদস্যপদ শুরু',
  firstNameLabel: 'প্রথম নাম',
  firstNamePlaceholder: 'প্রথম নাম লিখুন',
  lastNameLabel: 'পদবি',
  lastNamePlaceholder: 'পদবি লিখুন',
  phonePlaceholder: 'ফোন নম্বর লিখুন',
  profileUpdated: 'প্রোফাইল সফলভাবে আপডেট হয়েছে',
  profileUpdateFailed: 'প্রোফাইল আপডেটে ব্যর্থ',
  profileLoadError: 'প্রোফাইল লোড করা যায়নি',
  profileNotSet: 'সেট করা হয়নি',

  // ── HelpScreen ────────────────────────────────────────────────────────────
  helpAndSupport: 'সাহায্য ও সহায়তা',
  helpIntroTitle: 'আমরা কীভাবে সাহায্য করতে পারি?',
  helpIntroText:
    'UpCheck হলো আপনার চিংড়ি অ্যাকুয়াকালচার ব্যবস্থাপনার সঙ্গী। এটি থেকে সর্বোচ্চ সুবিধা পাওয়ার উপায় জানুন।',
  quickGuides: 'দ্রুত গাইড',
  contactUs: 'যোগাযোগ করুন',
  // Help topic titles
  helpTopicWaterTitle: 'পানির মান পর্যবেক্ষণ',
  helpTopicWaterDesc:
    'প্রতিদিন pH, DO, তাপমাত্রা, লবণাক্ততা ও অন্যান্য প্যারামিটার রেকর্ড করুন। মান সর্বোত্তম সীমার বাইরে গেলে সতর্কতা পান।',
  helpTopicFeedTitle: 'খাদ্য ব্যবস্থাপনা',
  helpTopicFeedDesc:
    'খাদ্য ব্যবহার ট্র্যাক করুন, MBW-এর ভিত্তিতে দৈনিক খাদ্যের পরিমাণ গণনা করুন এবং খাওয়ানোর দক্ষতা (FCR) পর্যবেক্ষণ করুন।',
  helpTopicSamplingTitle: 'নমুনার রেকর্ড',
  helpTopicSamplingDesc:
    'নিয়মিত নমুনা নেওয়া বায়োমাস, বেঁচে থাকার হার এবং গড় দেহ ওজন (ABW/MBW) অনুমান করতে সাহায্য করে।',
  helpTopicCalculatorsTitle: 'ক্যালকুলেটর',
  helpTopicCalculatorsDesc:
    'FCR, খাদ্যের পরিমাণ, পণ্যের ডোজ এবং মুক্ত অ্যামোনিয়া গণনার জন্য অন্তর্নির্মিত ক্যালকুলেটর ব্যবহার করুন।',
  helpTopicSimulationsTitle: 'সিমুলেশন',
  helpTopicSimulationsDesc:
    'ফসলের তারিখ, প্রত্যাশিত ফলন পূর্বাভাস এবং চাষ কৌশল অপ্টিমাইজ করতে বৃদ্ধির সিমুলেশন চালান।',
  helpTopicFarmTitle: 'খামার ব্যবস্থাপনা',
  helpTopicFarmDesc:
    'পুকুর সংগঠিত করুন, চক্র পরিচালনা করুন, ইনভেন্টরি ট্র্যাক করুন এবং খামার প্রতি আর্থিক প্রতিবেদন দেখুন।',

  // ── AboutScreen ───────────────────────────────────────────────────────────
  aboutUpcheck: 'UpCheck সম্পর্কে',
  appTagline: 'চিংড়ি অ্যাকুয়াকালচার ম্যানেজমেন্ট',
  versionLabel: 'সংস্করণ',
  buildInfo: 'বিল্ড 2026.04.30',
  descriptionLabel: 'বিবরণ',
  descriptionText:
    'UpCheck হলো একটি ব্যাপক চিংড়ি অ্যাকুয়াকালচার ব্যবস্থাপনা অ্যাপ্লিকেশন যা কৃষকদের পানির মান পর্যবেক্ষণ, খাদ্য ব্যবস্থাপনা, বৃদ্ধি ট্র্যাকিং এবং চাষ পদ্ধতি অপ্টিমাইজ করতে সাহায্য করে।',
  featuresLabel: 'বৈশিষ্ট্য',
  featureMultiFarm: 'একাধিক খামার ব্যবস্থাপনা',
  featurePondMonitoring: 'পুকুর পর্যবেক্ষণ ও লগ',
  featureWaterQuality: 'পানির মান ট্র্যাকিং',
  featureFeedManagement: 'খাদ্য ব্যবস্থাপনা',
  featureGrowthSimulations: 'বৃদ্ধির সিমুলেশন',
  featureFinancialReports: 'আর্থিক প্রতিবেদন',
  developedByLabel: 'নির্মাতা',
  developedByTeam: 'UpCheck টিম',
  developedByLocation: 'ভারত',
  footerCopyright: '© 2026 UpCheck। সর্বস্বত্ব সংরক্ষিত।',

  // ── TwoFactorScreen ───────────────────────────────────────────────────────
  twoFactorTitle: 'দ্বি-স্তরীয় প্রমাণীকরণ',
  twoFactorEnabled: 'সক্রিয়',
  twoFactorNotEnabled: 'সক্রিয় নয়',
  twoFactorSetup: '2FA সেটআপ করুন',
  twoFactorScanHelp:
    'একটি অথেনটিকেটর অ্যাপ (Google Authenticator, Authy…) দিয়ে এই QR কোডটি স্ক্যান করুন, তারপর সম্পন্ন করতে উৎপন্ন কোডটি লিখুন।',
  twoFactorManualKey: 'ম্যানুয়াল কী: {{secret}}',
  twoFactorCodeLabel: 'অ্যাপের কোড',
  twoFactorVerifyEnable: 'যাচাই করুন ও সক্রিয় করুন',
  twoFactorDisableHelp: 'দ্বি-স্তরীয় প্রমাণীকরণ বন্ধ করতে একটি বর্তমান কোড লিখুন।',
  twoFactorAuthCodeLabel: 'অথেনটিকেটর কোড',
  twoFactorDisable: '2FA বন্ধ করুন',
  twoFactorInvalidCode: 'আপনার অথেনটিকেটর অ্যাপ থেকে ৬ সংখ্যার কোডটি লিখুন।',
  twoFactorCodeRequired: '2FA বন্ধ করতে একটি বর্তমান ৬ সংখ্যার কোড লিখুন।',
  twoFactorEnabledSuccess: 'দ্বি-স্তরীয় প্রমাণীকরণ এখন চালু আছে।',
  twoFactorDisabledSuccess: 'দ্বি-স্তরীয় প্রমাণীকরণ এখন বন্ধ আছে।',
  twoFactorSetupError: '2FA সেটআপ শুরু করা যায়নি',

  // ── NotificationsScreen ───────────────────────────────────────────────────
  notificationsTitle: 'বিজ্ঞপ্তি',
  notificationsEmpty: 'সব পড়া হয়ে গেছে!',
  notificationsEmptyDesc: 'আপনার কোনো নতুন বিজ্ঞপ্তি নেই।',
  notificationsLoadError: 'বিজ্ঞপ্তি লোড করা যায়নি',
};

export default settings;
