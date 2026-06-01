const settings = {
  // ── SettingsScreen ────────────────────────────────────────────────────────
  title: 'Settings',
  language: 'Language',
  languageDesc: 'Choose your preferred app language',
  appPreferences: 'App Preferences',
  offlineSync: 'Offline Sync',
  offlineSyncDesc: 'Cache data for offline usage',
  notifications: 'Notifications',
  pushNotifications: 'Push Notifications',
  pushNotificationsDesc: 'Alerts for water quality & feeding',
  emailSummaries: 'Email Summaries',
  emailSummariesDesc: 'Weekly performance reports',
  security: 'Security',
  twoFactor: 'Two-Factor Authentication',
  about: 'About Upcheck',
  privacyPolicy: 'Privacy Policy',
  termsOfService: 'Terms of Service',

  // ── ProfileScreen ─────────────────────────────────────────────────────────
  profile: 'Profile',
  editProfile: 'Edit Profile',
  emailAddress: 'Email Address',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  memberSince: 'Member Since',
  firstNameLabel: 'First Name',
  firstNamePlaceholder: 'Enter first name',
  lastNameLabel: 'Last Name',
  lastNamePlaceholder: 'Enter last name',
  phonePlaceholder: 'Enter phone number',
  profileUpdated: 'Profile updated successfully',
  profileUpdateFailed: 'Failed to update profile',
  profileLoadError: "Couldn't Load Profile",
  profileNotSet: 'Not set',

  // ── HelpScreen ────────────────────────────────────────────────────────────
  helpAndSupport: 'Help & Support',
  helpIntroTitle: 'How can we help?',
  helpIntroText:
    "UpCheck is your shrimp aquaculture management companion. Here's how to get the most out of it.",
  quickGuides: 'Quick Guides',
  contactUs: 'Contact Us',
  // Help topic titles
  helpTopicWaterTitle: 'Water Quality Monitoring',
  helpTopicWaterDesc:
    'Record pH, DO, temperature, salinity and other parameters daily. Get alerts when values are outside optimal ranges.',
  helpTopicFeedTitle: 'Feed Management',
  helpTopicFeedDesc:
    'Track feed usage, calculate daily feed amounts based on MBW, and monitor feeding efficiency (FCR).',
  helpTopicSamplingTitle: 'Sampling Records',
  helpTopicSamplingDesc:
    'Regular sampling helps estimate biomass, survival rate, and average body weight (ABW/MBW).',
  helpTopicCalculatorsTitle: 'Calculators',
  helpTopicCalculatorsDesc:
    'Use built-in calculators for FCR, feed amounts, product dosage, and free ammonia calculations.',
  helpTopicSimulationsTitle: 'Simulations',
  helpTopicSimulationsDesc:
    'Run growth simulations to predict harvest dates, expected yields, and optimize cultivation strategies.',
  helpTopicFarmTitle: 'Farm Management',
  helpTopicFarmDesc:
    'Organize ponds, manage cycles, track inventory, and view financial reports per farm.',

  // ── AboutScreen ───────────────────────────────────────────────────────────
  aboutUpcheck: 'About UpCheck',
  appTagline: 'Shrimp Aquaculture Management',
  versionLabel: 'Version',
  buildInfo: 'Build 2026.04.30',
  descriptionLabel: 'Description',
  descriptionText:
    'UpCheck is a comprehensive shrimp aquaculture management application designed to help farmers monitor water quality, manage feed, track growth, and optimize cultivation practices.',
  featuresLabel: 'Features',
  featureMultiFarm: 'Multi-farm management',
  featurePondMonitoring: 'Pond monitoring & logs',
  featureWaterQuality: 'Water quality tracking',
  featureFeedManagement: 'Feed management',
  featureGrowthSimulations: 'Growth simulations',
  featureFinancialReports: 'Financial reports',
  developedByLabel: 'Developed By',
  developedByTeam: 'UpCheck Team',
  developedByLocation: 'India',
  footerCopyright: '© 2026 UpCheck. All rights reserved.',

  // ── TwoFactorScreen ───────────────────────────────────────────────────────
  twoFactorTitle: 'Two-Factor Authentication',
  twoFactorEnabled: 'Enabled',
  twoFactorNotEnabled: 'Not enabled',
  twoFactorSetup: 'Set up 2FA',
  twoFactorScanHelp:
    'Scan this QR code with an authenticator app (Google Authenticator, Authy…), then enter the generated code to finish.',
  twoFactorManualKey: 'Manual key: {{secret}}',
  twoFactorCodeLabel: 'Code from app',
  twoFactorVerifyEnable: 'Verify & enable',
  twoFactorDisableHelp: 'Enter a current code to turn off two-factor authentication.',
  twoFactorAuthCodeLabel: 'Authenticator code',
  twoFactorDisable: 'Disable 2FA',
  twoFactorInvalidCode: 'Enter the 6-digit code from your authenticator app.',
  twoFactorCodeRequired: 'Enter a current 6-digit code to disable 2FA.',
  twoFactorEnabledSuccess: 'Two-factor authentication is now on.',
  twoFactorDisabledSuccess: 'Two-factor authentication is now off.',
  twoFactorSetupError: 'Could not start 2FA setup',

  // ── NotificationsScreen ───────────────────────────────────────────────────
  notificationsTitle: 'Notifications',
  notificationsEmpty: 'All Caught Up!',
  notificationsEmptyDesc: 'You have no new notifications.',
  notificationsLoadError: "Couldn't Load Notifications",

  // ── Account deletion (Play Store requirement) ─────────────────────────────
  deleteAccount: 'Delete Account',
  deleteAccountConfirm: 'This permanently deletes your account and all your farm data. This cannot be undone. Continue?',
  deleteAccountHint: 'Permanently removes your account and all data you own.',
  deleteAccountError: 'Could not delete your account. Please try again.',
};

export default settings;
