/**
 * Legal copy shown in-app (Settings → Privacy Policy / Terms) and mirrored to
 * docs/legal/*.md for public hosting (required for the Play Store listing).
 *
 * Placeholders in [SQUARE BRACKETS] must be completed by the operator before
 * publishing (legal entity, address, jurisdiction, contact email, dates).
 */

export interface LegalBlock {
  heading?: string;
  text: string;
}

export const LEGAL_META = {
  company: 'Upcheck Technologies Private Limited',
  appName: 'Upcheck',
  contactEmail: 'admin@upcheck.in',
  // Operator to complete before publishing — real values only known to Upcheck:
  address: '[Registered office address]',
  governingLaw: '[State], India',
  effectiveDate: '9 July 2026',
  lastUpdated: '9 July 2026',
  privacyUrl: '[https://upcheck.in/privacy]',
  termsUrl: '[https://upcheck.in/terms]',
  deletionUrl: '[https://upcheck.in/account-deletion]',
};

export const PRIVACY_POLICY: LegalBlock[] = [
  {
    text:
      `${LEGAL_META.company} ("we", "us", "our") operates the ${LEGAL_META.appName} mobile application ` +
      `(the "App"), a shrimp-aquaculture farm-management tool. This Privacy Policy explains what ` +
      `personal data we collect, why, how we use and share it, and the choices you have. ` +
      `Effective ${LEGAL_META.effectiveDate}. Last updated ${LEGAL_META.lastUpdated}.`,
  },
  {
    heading: '1. Information we collect',
    text:
      'Account & identity: email address, name, username, profile photo, and (when you sign in with ' +
      'phone verification) your phone number. Passwords are stored only as salted hashes; we never ' +
      'store them in plain text.\n\n' +
      'Authentication provider data: if you sign in with Google we receive your Google account email, ' +
      'name and avatar; if you verify with Truecaller we receive your verified phone number, name and ' +
      'the Truecaller verification result.\n\n' +
      'Farm operational data you enter: farms, ponds and culture cycles (including farm location/GPS ' +
      'coordinates and boundary you provide), water-quality readings, feed, sampling, mortality, ' +
      'chemical, plankton, microbiology, disease and treatment logs, harvests, inventory, expenses and ' +
      'transactions, tasks and simulations.\n\n' +
      'Device & technical data: app version, device model and OS, a push-notification token, and ' +
      'diagnostic logs. Sensitive verification fields are redacted from our logs.',
  },
  {
    heading: '2. How we use your information',
    text:
      'To create and secure your account and verify your identity; to provide the App\'s features ' +
      '(storing and displaying your farm data, calculations, reports and alerts); to send ' +
      'transactional emails (verification, password reset) and push notifications you have enabled; ' +
      'to operate, maintain, troubleshoot and improve the service; and to comply with legal ' +
      'obligations. We do not sell your personal data and we do not use it for third-party advertising.',
  },
  {
    heading: '3. Permissions we request (Android)',
    text:
      'Phone state (READ_PHONE_STATE) is used only to support Truecaller One-Tap phone-number ' +
      'verification. We do NOT request access to your call log or SMS. Camera/photo access (if ' +
      'granted) is used only to attach images to your farm records. You can sign in with email, ' +
      'Google, or an emailed one-time code instead of phone verification, and you may revoke any ' +
      'permission in your device settings.',
  },
  {
    heading: '4. How we share information (processors)',
    text:
      'We share data only with service providers that process it on our behalf under contract:\n' +
      '• Supabase — authentication and database hosting.\n' +
      '• Brevo (Sendinblue) — transactional email delivery.\n' +
      '• Truecaller — phone-number identity verification (only when you choose it).\n' +
      '• Google — sign-in (only when you choose it).\n' +
      '• Expo — push-notification delivery.\n' +
      '• Render — backend application hosting.\n\n' +
      'We may also disclose information if required by law or to protect rights, safety and security.',
  },
  {
    heading: '5. Data retention',
    text:
      'We keep your account and farm data while your account is active. When you delete your account ' +
      'we delete your profile and the farm data you own, and remove your authentication identity. ' +
      'Backups and legally required records may persist for a limited period before being purged.',
  },
  {
    heading: '6. Your rights & choices',
    text:
      'You can view and edit your profile in the App, change notification and language settings, and ' +
      'delete your account at any time from Profile → Delete Account (this permanently removes your ' +
      'account and owned data). Depending on your jurisdiction you may also have rights to access, ' +
      'correct, export or restrict processing of your data; contact us to exercise them.',
  },
  {
    heading: '7. Data security & location',
    text:
      'We use encryption in transit (HTTPS), hashed passwords, signed session tokens and access ' +
      'controls. Data is processed on our providers\' cloud infrastructure, which may be located ' +
      'outside your country; we rely on appropriate safeguards for any such transfers.',
  },
  {
    heading: '8. Children',
    text:
      'The App is intended for business/agricultural use by adults and is not directed to children ' +
      'under 13 (or the minimum age in your jurisdiction). We do not knowingly collect data from ' +
      'children.',
  },
  {
    heading: '9. Changes & contact',
    text:
      `We may update this policy; material changes will be notified in-app or by email. Questions or ` +
      `requests: ${LEGAL_META.contactEmail}. ${LEGAL_META.company}, ${LEGAL_META.address}.`,
  },
];

export const TERMS: LegalBlock[] = [
  {
    text:
      `These Terms & Conditions ("Terms") govern your use of the ${LEGAL_META.appName} application ` +
      `provided by ${LEGAL_META.company}. By creating an account or using the App you agree to these ` +
      `Terms and to our Privacy Policy. Effective ${LEGAL_META.effectiveDate}.`,
  },
  {
    heading: '1. Eligibility & accounts',
    text:
      'You must be at least 18 years old (or the age of majority where you live) and able to enter a ' +
      'binding contract. You are responsible for the accuracy of the information you provide, for ' +
      'keeping your credentials secure, and for all activity under your account.',
  },
  {
    heading: '2. Acceptable use',
    text:
      'You agree not to misuse the App: no unlawful, infringing or harmful activity; no attempts to ' +
      'breach security, reverse-engineer, scrape, overload or disrupt the service; and no uploading of ' +
      'content you do not have the right to use. You must comply with all applicable aquaculture, ' +
      'export and food-safety regulations (e.g., CAA/MPEDA guidance on banned substances).',
  },
  {
    heading: '3. Your data & content',
    text:
      'You retain ownership of the farm data and content you enter. You grant us a limited licence to ' +
      'host and process it solely to operate the App for you. You are responsible for maintaining your ' +
      'own copies of important records.',
  },
  {
    heading: '4. Advisory nature — no warranty on outcomes',
    text:
      'The App provides calculators, simulations, alerts and reference information for guidance only. ' +
      'It is not professional, veterinary, financial or legal advice, and outputs may be approximate. ' +
      'Decisions about your farm, stock, treatments and finances remain your responsibility. The App ' +
      'is provided "as is" and "as available" without warranties of any kind to the maximum extent ' +
      'permitted by law.',
  },
  {
    heading: '5. Third-party services',
    text:
      'The App relies on third-party services (Supabase, Google, Truecaller, Brevo, Expo, Render). ' +
      'Your use of sign-in providers is also subject to their terms. We are not responsible for ' +
      'third-party services\' availability or actions.',
  },
  {
    heading: '6. Limitation of liability',
    text:
      'To the maximum extent permitted by law, ' + LEGAL_META.company + ' shall not be liable for any ' +
      'indirect, incidental, special or consequential damages, or for loss of data, profits, crop or ' +
      'revenue, arising from your use of or inability to use the App.',
  },
  {
    heading: '7. Suspension & termination',
    text:
      'You may stop using the App and delete your account at any time. We may suspend or terminate ' +
      'access for breach of these Terms or to protect the service. On termination your right to use ' +
      'the App ends; data handling follows our Privacy Policy.',
  },
  {
    heading: '8. Changes & governing law',
    text:
      `We may update these Terms; continued use after changes means you accept them. These Terms are ` +
      `governed by the laws of ${LEGAL_META.governingLaw}, and disputes are subject to the courts of ` +
      `that jurisdiction. Contact: ${LEGAL_META.contactEmail}.`,
  },
];
