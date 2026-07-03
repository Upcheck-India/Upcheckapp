const auth = {
  // ── App header (LoginScreen) ──────────────────────────────────────────────
  title: 'UpCheck',
  subtitle: 'झींगा जलकृषि प्रबंधन',

  // ── Shared field labels / placeholders ───────────────────────────────────
  emailLabel: 'ईमेल',
  emailPlaceholder: 'your@email.com',
  passwordLabel: 'पासवर्ड',
  passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',

  // ── Shared validation messages ────────────────────────────────────────────
  emailRequired: 'ईमेल आवश्यक है',
  emailInvalid: 'वैध ईमेल दर्ज करें',
  passwordRequired: 'पासवर्ड आवश्यक है',

  // ── LoginScreen ───────────────────────────────────────────────────────────
  signIn: 'साइन इन करें',
  orContinueWith: 'या इससे जारी रखें',
  forgotPassword: 'पासवर्ड भूल गए?',
  signInWithEmailCode: 'ईमेल कोड से साइन इन करें',
  createAccount: 'खाता बनाएं',

  // Verify-email banner (shown when pendingVerificationEmail is set)
  verifyBanner: 'साइन अप पूरा करने के लिए {{email}} सत्यापित करें। ईमेल पुनः भेजने के लिए टैप करें।',

  // Resend-verification alerts
  emailRequiredAlert: 'ईमेल आवश्यक है',
  enterEmailFirst: 'पहले ऊपर अपना ईमेल दर्ज करें।',
  verificationSent: 'सत्यापन भेजा गया',
  verificationResentTo: 'हमने सत्यापन ईमेल {{email}} पर पुनः भेजा है।',
  couldNotResend: 'सत्यापन ईमेल पुनः नहीं भेजा जा सका',

  // Login-time validation
  passwordTooShort: 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए',

  // ── RegisterScreen ────────────────────────────────────────────────────────
  createAccountTitle: 'खाता बनाएं',
  registerSubtitle: 'अपने झींगा फार्म प्रबंधित करने के लिए UpCheck से जुड़ें',

  firstNameLabel: 'पहला नाम',
  firstNamePlaceholder: 'अपना पहला नाम दर्ज करें',
  firstNameRequired: 'पहला नाम आवश्यक है',

  lastNameLabel: 'अंतिम नाम',
  lastNamePlaceholder: 'अपना अंतिम नाम दर्ज करें',

  passwordAtLeast8Placeholder: 'कम से कम 8 अक्षर',
  passwordTooShortRegister: 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए',
  passwordHint: 'न्यूनतम 8 अक्षर',

  confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
  confirmPasswordPlaceholder: 'पासवर्ड दोबारा दर्ज करें',
  passwordsDoNotMatch: 'पासवर्ड मेल नहीं खाते',

  alreadyHaveAccount: 'पहले से खाता है? साइन इन करें',

  // Registration success screen
  checkYourEmail: 'अपना ईमेल जांचें',
  verificationLinkSent:
    'हमने {{email}} पर एक सत्यापन लिंक भेजा है। जारी रखने के लिए अपना ईमेल सत्यापित करें।',
  backToLogin: 'लॉगिन पर वापस जाएं',

  // ── ForgotPasswordScreen ──────────────────────────────────────────────────
  resetPassword: 'पासवर्ड रीसेट करें',
  resetPasswordSubtitle:
    'अपना ईमेल पता दर्ज करें और हम आपको पासवर्ड रीसेट करने का लिंक भेजेंगे।',
  sendResetLink: 'रीसेट लिंक भेजें',
  failedToSendReset: 'रीसेट ईमेल भेजने में विफल',
  passwordResetSent:
    'हमने {{email}} पर पासवर्ड रीसेट लिंक भेजा है। पासवर्ड रीसेट करने के लिए ईमेल में दिए निर्देशों का पालन करें।',

  // ── OtpLoginScreen ────────────────────────────────────────────────────────
  signInWithEmailCodeTitle: 'ईमेल कोड से साइन इन करें',
  emailRequiredBody: 'अपना खाता ईमेल दर्ज करें।',
  codeSent: 'कोड भेजा गया',
  checkEmailForCode: '6-अंकीय लॉगिन कोड के लिए अपना ईमेल जांचें।',
  couldNotSendCode: 'कोड नहीं भेजा जा सका',
  noSessionReturned: 'कोई सत्र नहीं मिला। कृपया पुनः प्रयास करें।',
  invalidOrExpiredCode: 'अमान्य या समयसीमा समाप्त कोड',
  invalidCode: 'अमान्य कोड',
  enterSixDigitCode: 'अपने ईमेल से 6-अंकीय कोड दर्ज करें।',
  sixDigitCodeLabel: '6-अंकीय कोड',
  sendCode: 'कोड भेजें',
  verifyAndSignIn: 'सत्यापित करें और साइन इन करें',
  resendCode: 'कोड पुनः भेजें',

  // ── TwoFactorChallengeScreen ──────────────────────────────────────────────
  twoFactorTitle: 'दो-चरणीय सत्यापन',
  twoFactorHelp:
    'साइन इन पूरा करने के लिए अपने ऑथेंटिकेटर ऐप से 6-अंकीय कोड दर्ज करें।',
  authenticatorCodeLabel: 'ऑथेंटिकेटर कोड',
  invalidCodeAlert: 'अपने ऑथेंटिकेटर ऐप से 6-अंकीय कोड दर्ज करें।',
  noSessionSignInAgain: 'कोई सत्र नहीं मिला। कृपया पुनः साइन इन करें।',
  invalidVerificationCode: 'अमान्य सत्यापन कोड',
  verify: 'सत्यापित करें',

  // ── TruecallerLoginScreen ─────────────────────────────────────────────────
  truecallerTitle: 'Truecaller से साइन इन करें',
  truecallerSubtitle: 'अपने भारतीय मोबाइल नंबर से सेकंडों में सत्यापित करें।',
  requestPhonePermissions:
    'आपका नंबर सत्यापित करने के लिए हम फोन अनुमतियाँ माँगेंगे।',
  permissionsRequired:
    'Truecaller{{suffix}} के साथ जारी रखने के लिए फोन अनुमतियाँ आवश्यक हैं। कृपया सेटिंग्स में अनुमति दें या ईमेल से साइन इन करें।',
  loginFailed: 'लॉगिन विफल',
  noSessionByServer: 'सर्वर से कोई सत्र नहीं मिला।',
  networkError: 'नेटवर्क त्रुटि',
  truecallerAuthFailed: 'Truecaller प्रमाणीकरण विफल',
  verificationFailed: 'सत्यापन विफल',
  missingAccessToken: 'Truecaller से एक्सेस टोकन गायब है।',
  incompleteSignedPayload: 'Truecaller से अधूरा हस्ताक्षरित पेलोड।',
  truecallerCannotVerify: 'Truecaller नंबर सत्यापित नहीं कर सका।',
  unknownError: 'अज्ञात त्रुटि',
  networkCheckMessage:
    'इंटरनेट कनेक्शन नहीं है। कृपया अपना नेटवर्क जांचें और पुनः प्रयास करें',
  truecallerErrorPrefix: 'Truecaller त्रुटि: ',
  waitingForMissedCall: 'मिस्ड कॉल की प्रतीक्षा में',
  missedCallBody:
    'आपको जल्द ही एक मिस्ड कॉल आएगी। इसे न उठाएं — Truecaller स्वचालित रूप से सत्यापित कर देगा।',
  expiresIn: '{{seconds}}s में समाप्त',
  verifyingWithUpcheck: 'Upcheck से सत्यापित किया जा रहा है...',
  signInWithEmail: 'ईमेल से साइन इन करें',

  // ── OtpEntrySection ───────────────────────────────────────────────────────
  enterOtpTitle: 'OTP दर्ज करें',
  otpSubtitle:
    'हमने आपके फोन पर एक सत्यापन कोड भेजा है। जारी रखने के लिए नीचे दर्ज करें।',
  otpExpired: 'OTP समयसीमा समाप्त',
  otpExpiresIn: '{{time}} में समाप्त',
  otpLabel: 'OTP',
  otpPlaceholder: 'कोड दर्ज करें',
  invalidOtp: 'अमान्य OTP',
  resendOtp: 'OTP पुनः भेजें',
  resendOtpIn: '{{time}} में OTP पुनः भेजें',
  verificationFailedError: 'सत्यापन विफल',

  // ── PhoneEntrySection ─────────────────────────────────────────────────────
  verifyPhoneTitle: 'अपना फोन नंबर सत्यापित करें',
  verifyPhoneSubtitle:
    'हम आपके भारतीय मोबाइल नंबर पर एक सत्यापन कोड भेजेंगे।',
  firstNameInputLabel: 'पहला नाम',
  firstNameInputPlaceholder: 'आपका पहला नाम',
  lastNameInputLabel: 'अंतिम नाम (वैकल्पिक)',
  lastNameInputPlaceholder: 'आपका अंतिम नाम',
  mobileNumberLabel: 'मोबाइल नंबर',
  mobileNumberHint: '10-अंकीय भारतीय मोबाइल नंबर',
  invalidPhoneError: 'वैध 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें',
  invalidFirstNameError: 'कृपया अपना पहला नाम दर्ज करें',
  sendVerificationCode: 'सत्यापन कोड भेजें',
  consentPrefix: "खाता बनाकर, आप हमारी",
  legalPrefix: "जारी रखकर, आप हमारी",
  consentAnd: "और",

  // ── Account type (role selection) ─────────────────────────────────────────
  accountTypeLabel: 'मैं हूँ…',
  accountTypeRequired: 'कृपया एक खाता प्रकार चुनें',
  accountOwnerTitle: 'फार्म मालिक',
  accountOwnerDesc: 'अपना फार्म सेट करें और प्रबंधित करें',
  accountWorkerTitle: 'कर्मचारी',
  accountWorkerDesc: 'किसी फार्म से जुड़ें और दैनिक काम दर्ज करें',
};
export default auth;
