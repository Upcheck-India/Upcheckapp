/**
 * Legal copy shown in-app (Settings → Privacy Policy / Terms, and from the
 * sign-up consent line) and mirrored to docs/legal/*.md for public hosting,
 * which the Play Store listing requires.
 *
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH. Do not hand-edit docs/legal/*.md —
 * run `node scripts/sync-legal-docs.js` from frontend/ to regenerate them, and
 * `legalDocsInSync.test.ts` fails if they drift.
 *
 * Deliberately English-only. A legal document mistranslated is worse than one
 * a reader must translate: "consent", "liability" and "processing" carry
 * specific meanings, and a well-meaning paraphrase into six languages changes
 * what the document says. The app's INTERFACE is fully localised; this text is
 * not, and section 13 says so plainly.
 */

export interface LegalBlock {
  heading?: string;
  text: string;
}

export const LEGAL_META = {
  company: 'Upcheck Technologies Private Limited',
  appName: 'Neerani',
  contactEmail: 'admin@upcheck.in',
  governingLaw: 'India',
  jurisdiction: 'Chennai, Tamil Nadu',
  effectiveDate: '5 September 2026',
  lastUpdated: '21 September 2026',
  privacyUrl: 'https://upcheck.in/privacy',
  termsUrl: 'https://upcheck.in/terms',
  deletionUrl: 'https://upcheck.in/account-deletion',
  /** Days before residual backup copies are rotated out after deletion. */
  deletionGraceDays: 30,
  // ── Grievance contact (DPDP published particulars, spec C2.3) ──
  // TODO(human): NOT YET DECIDED. Fill these in once a grievance officer is
  // named and the registered address / CIN are confirmed. Each line renders in
  // the policy ONLY when filled — never invent a value here.
  grievanceOfficerName: '',
  grievanceOfficerDesignation: '',
  grievanceEmail: '',
  postalAddress: '',
  registeredAddress: '',
  cin: '',
};

/**
 * The version a consent row records (user_consents.doc_version). Bump it with
 * `lastUpdated` whenever the Privacy Policy or Terms change materially: every
 * signed-in user then sees the "what changed" sheet once and a fresh row is
 * recorded. 2026-09-21 is the first tracked version.
 */
export const LEGAL_VERSION = '2026-09-21';

/**
 * What the "what changed" sheet lists for LEGAL_VERSION. English only, like
 * the rest of this file. Replace the list when LEGAL_VERSION is bumped.
 */
export const POLICY_CHANGES = [
  'Every company that handles your data is now named, with where it is kept (sections 5 and 7).',
  'A table of how long each kind of data is kept (section 8).',
  'The app no longer asks for call-log access, and location is district-level only (section 4).',
  'Your consent choices are now recorded with the date and policy version, and how to withdraw them is spelled out (section 9).',
  'New and off unless you switch it on: letting your farm records or photos help improve Neerani\'s advice (section 3).',
];

/** Published particulars, only the lines that have actually been filled in. */
const GRIEVANCE_LINES = [
  LEGAL_META.grievanceOfficerName &&
    `Grievance Officer: ${LEGAL_META.grievanceOfficerName}` +
      (LEGAL_META.grievanceOfficerDesignation ? `, ${LEGAL_META.grievanceOfficerDesignation}` : ''),
  LEGAL_META.grievanceEmail && `Grievance email: ${LEGAL_META.grievanceEmail}`,
  LEGAL_META.postalAddress && `Postal address: ${LEGAL_META.postalAddress}`,
  LEGAL_META.registeredAddress && `Registered office: ${LEGAL_META.registeredAddress}`,
  LEGAL_META.cin && `CIN: ${LEGAL_META.cin}`,
]
  .filter(Boolean)
  .map((line) => `${line}\n`)
  .join('');

/**
 * DRAFT — PENDING LAWYER REVIEW (spec C3). Replacement for Terms §3 once
 * counsel approves it. Deliberately NOT wired into TERMS below; the in-app
 * toggle ships without it, and the Privacy Policy (sections 2, 3, 9) already
 * describes the opt-in.
 */
export const PENDING_LAWYER_TERMS_S3_DRAFT =
  'You own the farm data and content you enter. You give us a limited licence to store, process ' +
  'and display it for the sole purpose of operating the Service for you and your farm team.\n\n' +
  'We do not use your farm data or photos to train models — ours or anyone else\'s — unless you ' +
  'switch that on in Settings → Privacy → "Help improve Neerani\'s advice". Farm records and ' +
  'photos are separate choices. Switching either off stops any future use of that data for ' +
  'training. Your name, phone number and money figures are never used for training.\n\n' +
  'Export your important records and keep your own copies. The app can produce PDF, CSV and ' +
  'Excel exports at any time. No online service should be your only copy of something that ' +
  'matters.';

export const PRIVACY_POLICY: LegalBlock[] = [
  {
    text:
      `${LEGAL_META.company} ("we", "us", "our") operates the ${LEGAL_META.appName} mobile ` +
      `application and any ${LEGAL_META.appName} hardware devices that connect to it (together, ` +
      `the "Service"). ${LEGAL_META.appName} is a farm-management tool for shrimp and aquaculture ` +
      `producers, and is operated by ${LEGAL_META.company}.\n\n` +
      `This policy explains what personal data we collect, why we collect it, who we share it with, ` +
      `where it is kept, and the control you have over it. It is written to be read, not to be ` +
      `survived.\n\n` +
      `Effective ${LEGAL_META.effectiveDate}. Last updated ${LEGAL_META.lastUpdated}.`,
  },
  {
    heading: '1. Who this applies to',
    text:
      'Anyone who creates an Neerani account, or who is invited to a farm by an account holder as an ' +
      'owner, manager, worker or viewer. If a farm owner invites you, they decide what you can see ' +
      'and do on that farm, and the farm records you enter belong to that farm — not to you ' +
      'personally. Your own profile details remain yours.\n\n' +
      'The Service is available across India and, in future, internationally.',
  },
  {
    heading: '2. What we collect',
    text:
      'Account and identity — your name, email address, and profile photo if you add one. If you ' +
      'sign in by phone, your phone number. Passwords are never stored as text; only a salted hash ' +
      'is kept, which cannot be reversed back into your password.\n\n' +
      'Sign-in provider data — if you choose Google, we receive the email address, name and picture ' +
      'on that Google account. If you choose Truecaller, we receive your verified phone number and ' +
      'name, and the result of Truecaller\'s verification. We receive these only when you pick that ' +
      'method; you can use email instead and give us neither.\n\n' +
      'Farm records you enter — farms, ponds and culture cycles, pond location if you provide it, ' +
      'water-quality readings, feeding, sampling, mortality, chemical, plankton, microbiology, ' +
      'disease and treatment logs, harvests, inventory, expenses, transactions, tasks and ' +
      'simulations. This is the substance of the app and most of it is entered by you.\n\n' +
      'Photos — only images you choose to attach to a record (a health check, disease log, mortality ' +
      'log or your profile picture are the current uses), either taken with the camera or picked ' +
      'from your library. We do not access your gallery or camera in the background. Photos are ' +
      'converted to WebP format and their embedded metadata — including any location tag your device ' +
      'recorded — is stripped before storage; a small thumbnail is generated alongside the full ' +
      'image. A photo is visible to members of the farm the record belongs to, per their role, and ' +
      'is used only for that record and for exports you generate from it. It is never used to train ' +
      'any model unless you switch on photos under "Help improve Neerani\'s advice" (section 3), and ' +
      'never to train anyone else\'s. If we ever build a feature that analyses a photo automatically (for ' +
      'example, image-based disease detection), we will ask for your separate, specific consent ' +
      'before turning it on, and this policy will describe it before it launches.\n\n' +
      'Team and attendance — who belongs to a farm, their role, and attendance or task records an ' +
      'owner or manager keeps.\n\n' +
      'Device and technical data — app version, device model, operating system version, language, a ' +
      'push-notification token if you enable notifications, and diagnostic logs. Credentials, tokens ' +
      'and verification codes are stripped from our logs.\n\n' +
      'Connected Neerani devices — where you use Neerani hardware, the readings it takes (such as ' +
      'dissolved oxygen, pH, temperature and salinity), the pond it is assigned to, and device status ' +
      'such as its identifier, battery level and connectivity.',
  },
  {
    heading: '3. What we do with it',
    text:
      'We use your data to create and secure your account and confirm who you are; to run the ' +
      'features you came for — storing your records, producing calculations, reports and alerts; to ' +
      'send you transactional messages such as email verification and password resets, and the ' +
      'reminders and alerts you have switched on; to keep the Service working, diagnose faults and ' +
      'improve it; and to meet legal obligations.\n\n' +
      'Under India\'s Digital Personal Data Protection Act, 2023, our ground for each of these: your ' +
      'consent, given when you create an account and accept this policy, covers account creation, ' +
      'sign-in, storing the records you enter, running the features you use day to day, and sending ' +
      'transactional messages. Crash reporting and product analytics each rest on their own separate ' +
      'consent — see section 6, where you switch analytics on, and where crash reporting can be ' +
      'switched off. Where you have voluntarily provided data for a specified purpose and have not ' +
      'indicated you do not consent to its use (Section 7(a)) — for example, giving us your phone ' +
      'number to sign in with Truecaller — we rely on that certain legitimate use instead of asking ' +
      'you to consent twice for the same act. Retaining a record to meet a legal obligation, or ' +
      'disclosing data to comply with a court order or a request from a government agency legally ' +
      'entitled to make one, rests on Section 7\'s legitimate uses for compliance with law.\n\n' +
      'Improving Neerani\'s advice (model training) is a separate purpose with its own consent, and it ' +
      'is OFF unless you switch it on in Settings → Privacy → "Help improve Neerani\'s advice". Farm ' +
      'records and photos are two separate switches: you may allow one and refuse the other. If you ' +
      'allow it, we may use those records or photos to improve the advice the app gives. We never use ' +
      'your name, phone number or money figures for this. Switching it off stops any future use, and a ' +
      'training dataset only ever includes data from people whose switch is on at the time it is ' +
      'built.\n\n' +
      'What we do NOT do, and will not start doing quietly:\n' +
      '• We do not sell your personal data. Not to anyone, for any price.\n' +
      '• We do not use your data for third-party advertising, and we carry no ad networks.\n' +
      '• We do not share your farm records, harvest volumes, expenses, transactions or prices with ' +
      'other users, buyers, traders or competitors.\n' +
      '• We do not access your photo library, camera or call/phone state for any purpose beyond the ' +
      'specific feature you invoked, described in section 4. We do not read your contacts or ' +
      'messages — the app has no feature that accesses either.\n' +
      '• We do not build advertising or credit profiles about you.',
  },
  {
    heading: '4. Permissions, and exactly why each one exists',
    text:
      'Every permission below is optional. Android asks you, you may refuse, and you may withdraw ' +
      'consent later in your device settings. Refusing a permission disables the feature that needs ' +
      'it and nothing else — the rest of the app keeps working.\n\n' +
      'Phone state — used ONLY by Truecaller sign-in, so Truecaller can confirm that the number on ' +
      'this device is genuinely yours. The app no longer asks for call-log or phone-call access at ' +
      'all, and no longer verifies numbers with a missed call. We do not read, store, upload or ' +
      'analyse your call history or contacts list for any purpose of our own, and we never place ' +
      'calls. If you would rather not grant this, sign in with email or Google instead — ' +
      'Truecaller is one option, never a requirement.\n\n' +
      'Camera — to photograph a pond, a diseased animal or a document and attach it to a record.\n\n' +
      'Photos and files — to attach an existing image, and to save exports (PDF, CSV, Excel) you ask ' +
      'the app to produce.\n\n' +
      'Approximate location — only for the optional "Detect my district" shortcut when filling in ' +
      'your farm\'s district, to pre-fill local weather and prices. We ask for coarse (approximate) ' +
      'location, never precise location, only when you tap that shortcut, and never in the ' +
      'background. You can always pick your district from a list instead and skip this entirely.\n\n' +
      'Notifications — to deliver the reminders and alerts you configure. A notification\'s title and ' +
      'body are generated by us but delivered through our push provider (Expo) and your device\'s ' +
      'operating system (Google or Apple push services), which is how any app delivers a ' +
      'notification. They may appear on your lock screen depending on your device settings.\n\n' +
      'Other apps on your device — the app checks whether certain apps (such as WhatsApp, a mail ' +
      'app, a dialler or maps) are installed, so that sharing a report or calling a worker opens ' +
      'something that actually exists. We check for a short, specific list. We do not request the ' +
      'ability to see everything installed on your phone.',
  },
  {
    heading: '5. Who else is involved',
    text:
      'We use service providers who process data on our behalf, under contract, and only on our ' +
      'instructions. Named, with what they handle and where:\n' +
      '• Supabase — authentication and our primary database (account, farm and log records). ' +
      'Singapore.\n' +
      '• Render — hosts our backend servers. Singapore.\n' +
      '• Cloudflare R2 — stores the photos you attach to records. Asia-Pacific region.\n' +
      '• Sentry — crash and error reporting; see section 6. European Union (Germany).\n' +
      '• PostHog — product analytics, only with your consent; see section 6. United States.\n' +
      '• Expo — delivers push notifications and app updates to your device. United States.\n' +
      '• Brevo — sends verification, password-reset and notification emails on our behalf. ' +
      'European Union.\n\n' +
      'Two providers are involved only because you chose them, and their own terms and privacy ' +
      'policies also apply to that choice:\n' +
      '• Google — if you sign in with Google.\n' +
      '• Truecaller — if you verify your phone with Truecaller.\n\n' +
      'We may also disclose information where the law requires it, or where it is necessary to ' +
      'protect the rights, safety or security of our users, the public or Neerani. If we are ever ' +
      'compelled to hand over data, we will tell you unless we are legally barred from doing so.',
  },
  {
    heading: '6. Crash reports and analytics — what you control',
    text:
      'Crash reporting is on by default. When the app or our servers fail, we receive a technical ' +
      'report of the failure so we can fix it. These reports are deliberately stripped: they carry ' +
      'no passwords or session tokens, no phone numbers, no email addresses, and no financial ' +
      'values, harvest figures or farm records. Where an account must be identified at all, it is by ' +
      'an irreversible identifier, never your phone number. We consider this the minimum needed to ' +
      'keep the Service working, and it is the reason a fault can be fixed before you have to report ' +
      'it.\n\n' +
      'Product analytics is OFF unless you switch it on. It tells us which features are used and ' +
      'where people get stuck, so we build the right things. It is never enabled by default, never ' +
      'pre-ticked, and never inferred from your silence. If you turn it on and later change your ' +
      'mind, switching it off stops collection — it is not a preference we quietly ignore. Your farm ' +
      'records, money and harvest data are never sent to analytics, whatever your setting.\n\n' +
      'Declining either one does not reduce your access to any feature.',
  },
  {
    heading: '7. Where your data is kept',
    text:
      'Your data is stored and processed on secure servers located outside India. Your account, ' +
      'farm and log records are held in Singapore (Supabase, Render). Photos are stored with ' +
      'Cloudflare R2 in the Asia-Pacific region. Crash reports are processed in the European Union, ' +
      'and product analytics — only if you have opted in — in the United States. Push notifications ' +
      'and app updates are delivered through Expo in the United States, and transactional email ' +
      'through Brevo in the European Union. We rely on contractual safeguards with our providers for ' +
      'those transfers, and we choose providers who commit to appropriate security and ' +
      'confidentiality standards.\n\n' +
      'We protect data in transit with encryption (HTTPS), store passwords only as salted hashes, ' +
      'use signed session tokens, and restrict access to the small number of people who need it to ' +
      'operate the Service. No system is perfectly secure, and we will not pretend otherwise.\n\n' +
      'If a breach affects your personal data, we notify affected users and the Data Protection ' +
      'Board of India without delay, following our internal breach-response runbook. Our internal ' +
      'target is to complete that notification within 72 hours of confirming the breach.',
  },
  {
    heading: '8. How long we keep it',
    text:
      'How long depends on what it is:\n' +
      '• Account and profile data — while your account is active.\n' +
      '• Farm logs and records (ponds, cycles, water quality, feeding, sampling, mortality, ' +
      'chemical, plankton, microbiology, disease, treatment, harvest, inventory, expenses, ' +
      'transactions, tasks) — while the farm they belong to exists.\n' +
      '• Photos — while the record they are attached to exists. Deleting a record, a farm, or your ' +
      'account queues its photos for removal from storage; a short periodic clean-up job then ' +
      'deletes them, so removal follows shortly after rather than instantly.\n' +
      '• Email verification codes — 10 minutes, then they expire and cannot be reused.\n' +
      '• Photo links (the signed URLs used to view a photo) — 1 hour, then they stop working and a ' +
      'new one is generated on demand.\n' +
      `• Routine encrypted backups — rotated out within ${LEGAL_META.deletionGraceDays} days.\n\n` +
      'When you delete your account, deletion is immediate and cannot be undone. Your sign-in ' +
      'identity is removed first, then your profile and every farm, pond, cycle and log you own. We ' +
      'cannot recover any of it afterwards, so export anything you want to keep BEFORE you delete. ' +
      'Because the action is irreversible, we ask you to re-enter your password (or type a ' +
      'confirmation, where your account has no password) before it proceeds.\n\n' +
      'Residual copies in our routine encrypted backups are not accessible as an account and cannot ' +
      'be used to restore one.\n\n' +
      'Two things survive deletion, and you should know it: records we are legally required to ' +
      'retain, kept only for as long as the law requires; and data belonging to a farm you were a ' +
      'member of but did not own, which remains with that farm\'s owner. Deleting your account ' +
      'removes you, not their farm.\n\n' +
      'Routine backups are purged on their own cycle, shortly after the deletion window closes.',
  },
  {
    heading: '9. Your rights and your control',
    text:
      'You can, at any time:\n' +
      '• See and correct your profile in the app.\n' +
      '• Export your farm data as CSV, Excel or PDF and keep your own copy.\n' +
      '• Change your language, notification and reminder settings.\n' +
      '• Turn product analytics on or off.\n' +
      '• Withdraw any device permission in your phone\'s settings.\n' +
      '• Delete your account from Profile → Delete Account (immediate and irreversible — export first).\n\n' +
      'Under India\'s Digital Personal Data Protection Act, you also have the right to: access a ' +
      'summary of the personal data we hold about you and how we process it; have inaccurate or ' +
      'incomplete data corrected or updated; have your data erased once it is no longer needed for ' +
      'the purpose it was collected for; know who else we have shared your data with; get a way to ' +
      'raise a grievance with us; and nominate someone to exercise these rights on your behalf if ' +
      'you become incapacitated or die.\n\n' +
      'Withdrawing consent. You can withdraw any consent as easily as you gave it:\n' +
      '• Product analytics and crash reporting — switch them off in Settings → Privacy.\n' +
      '• Model training — switch off farm records, photos or both in Settings → Privacy → "Help ' +
      'improve Neerani\'s advice".\n' +
      '• The core Service — storing your records and running the features you use — cannot run ' +
      'without your data, so withdrawing that consent means closing your account (Profile → Delete ' +
      'Account).\n' +
      'Withdrawal stops future processing for that purpose; it does not undo processing already ' +
      'done. Each time you give or withdraw a consent we record the choice, the date, the policy ' +
      'version and the language it was shown in, so there is a record of what you agreed to.\n\n' +
      `Write to ${LEGAL_META.contactEmail} to exercise any of these. We aim to respond promptly, ` +
      'and in any case no later than 90 days.\n\n' +
      'If you are unhappy with how we have handled your data, tell us first — we would rather fix it ' +
      `than have you escalate. Contact ${LEGAL_META.contactEmail}. You also retain the right to ` +
      'complain to the Data Protection Board of India.',
  },
  {
    heading: '10. Age',
    text:
      'Neerani is a business tool for adults. You must be at least 18 to hold an account. We do not ' +
      'knowingly collect personal data from anyone under 18, and if we discover that we have, we ' +
      'will delete it. If you believe a minor has given us their data, contact us and we will act.',
  },
  {
    heading: '11. Connected Neerani devices',
    text:
      'Where you use Neerani hardware with the app, the device sends its readings and status to your ' +
      'account so they appear against the correct pond. That data is treated exactly like the ' +
      'readings you enter by hand: it is yours, it is not sold, and it is not shared with other ' +
      'users.\n\n' +
      'A device is linked to a pond by you, and can be unlinked by you. If a specific device ever ' +
      'collects a category of data not described in this policy, we will update this policy and tell ' +
      'you before that device starts sending it.',
  },
  {
    heading: '12. Changes to this policy',
    text:
      'We may update this policy as the Service changes. If a change materially affects your rights ' +
      'or what we collect, we will tell you in the app or by email before it takes effect — not by ' +
      'silently editing this page. The "last updated" date at the top always reflects the current ' +
      'version. When the version changes, the app shows you a short summary of what changed the next ' +
      'time you open it, and records that you have seen it.',
  },
  {
    heading: '13. Language, and how to reach us',
    text:
      'The app is available in English, Hindi, Bengali, Tamil, Telugu and Odia. This policy is ' +
      'published in English, which is the authoritative version — legal terms translated loosely can ' +
      'change what a document means, and we would rather you have an accurate text you can ask us ' +
      'about than a comfortable one that is wrong. If anything here is unclear in any language, ' +
      'write to us and we will explain it.\n\n' +
      `${LEGAL_META.company}\n` +
      `Email: ${LEGAL_META.contactEmail}\n` +
      GRIEVANCE_LINES +
      'Tamil Nadu, India.',
  },
];

export const TERMS: LegalBlock[] = [
  {
    text:
      `These Terms of Service ("Terms") are an agreement between you and ${LEGAL_META.company} ` +
      `("we", "us"), the company that operates ${LEGAL_META.appName}. They cover the ` +
      `${LEGAL_META.appName} application and any ${LEGAL_META.appName} hardware that connects to ` +
      `it (the "Service").\n\n` +
      `By creating an account or using the Service, you accept these Terms and our Privacy Policy. ` +
      `If you do not accept them, please do not use the Service.\n\n` +
      `Effective ${LEGAL_META.effectiveDate}. Last updated ${LEGAL_META.lastUpdated}.`,
  },
  {
    heading: '1. Who may use Neerani',
    text:
      'You must be at least 18 years old and legally able to enter into a contract. You are ' +
      'responsible for the accuracy of what you tell us, for keeping your password and device ' +
      'secure, and for everything done through your account.\n\n' +
      'Tell us promptly if you believe someone else has access to your account.',
  },
  {
    heading: '2. Farms, teams and roles',
    text:
      'A farm has an owner. The owner may invite others as managers, workers or viewers, and decides ' +
      'what each of them can see and do — including whether they can see financial information.\n\n' +
      'If you invite someone, you are responsible for who you invite and for removing them when they ' +
      'no longer need access. If you join someone else\'s farm, the records you create there belong ' +
      'to that farm, and the owner keeps them if you leave.\n\n' +
      'Do not share one account between several people. Invite them properly — it is free, and it is ' +
      'the only way the records show who actually did what.',
  },
  {
    heading: '3. Your data stays yours',
    text:
      'You own the farm data and content you enter. You give us a limited licence to store, process ' +
      'and display it for the sole purpose of operating the Service for you and your farm team. We ' +
      'claim no other rights over it, and we do not use it to train products for anyone else without ' +
      'asking you first.\n\n' +
      'Export your important records and keep your own copies. The app can produce PDF, CSV and ' +
      'Excel exports at any time. No online service should be your only copy of something that ' +
      'matters.',
  },
  {
    heading: '4. What Neerani is, and what it is not',
    text:
      'Neerani is a decision-support tool. It records what you tell it, calculates from those ' +
      'figures, and highlights things that may need attention. It is an aid to your own judgement ' +
      'and to qualified advice — it is not a substitute for either.\n\n' +
      'It is not professional, veterinary, agronomic, financial or legal advice. Its calculators, ' +
      'simulations, thresholds, alerts and predictions are approximations built on the data you ' +
      'enter and on general models that cannot see your pond. They may be wrong, and they will ' +
      'certainly be wrong if the data entered is wrong or out of date.\n\n' +
      'We do not guarantee any outcome — not survival rate, growth, feed conversion, yield, disease ' +
      'prevention, water quality, price or profit. Decisions about stocking, feeding, treatment, ' +
      'chemicals, harvest timing and sale remain entirely yours, and we encourage you to confirm ' +
      'anything consequential with a qualified aquaculture professional.\n\n' +
      'Reference material, market prices and news shown in the app are drawn from government, ' +
      'industry and public sources. We pass them on for convenience and do not control, verify or ' +
      'guarantee their accuracy or timeliness.\n\n' +
      'The Service is provided "as is" and "as available", without warranties of any kind to the ' +
      'fullest extent the law permits.',
  },
  {
    heading: '5. Using the Service responsibly',
    text:
      'You agree not to: use the Service unlawfully or to harm others; attempt to breach its ' +
      'security, access another user\'s data, reverse-engineer, scrape, overload or disrupt it; ' +
      'upload content you have no right to use, or anything unlawful or malicious; or misrepresent ' +
      'who you are.\n\n' +
      'You remain responsible for complying with every law and regulation that applies to your farm ' +
      '— including aquaculture licensing, effluent rules, food-safety requirements, and restrictions ' +
      'on banned or restricted substances under CAA, MPEDA and equivalent authorities. Where the app ' +
      'flags a banned substance it is a convenience, not a compliance guarantee, and the ' +
      'responsibility for what enters your pond is yours.',
  },
  {
    heading: '6. Cost',
    text:
      'Neerani is currently free to use.\n\n' +
      'We may introduce paid features or plans in future. If we do, we will tell you in advance, ' +
      'paid features will be clearly marked before you are charged, and you will never be billed ' +
      'without agreeing first. Your existing data will remain accessible to you and exportable ' +
      'whether or not you take a paid plan.',
  },
  {
    heading: '7. Neerani hardware',
    text:
      'Where you use Neerani devices with the app, these Terms cover the app and the service the ' +
      'device connects to. The purchase, warranty, replacement and physical use of the device itself ' +
      'are governed by the terms supplied with that device.\n\n' +
      'Device readings are subject to section 4 in the same way as anything else in the app: a ' +
      'sensor can drift, foul, lose power or lose connectivity, and a reading is information for ' +
      'your judgement, not a guarantee about your pond. Do not rely on a device alone for a decision ' +
      'that could cost you a crop.',
  },
  {
    heading: '8. Availability and updates',
    text:
      'We work to keep the Service available but cannot promise uninterrupted access. It depends on ' +
      'your device, your connection and providers outside our control, and we may need to interrupt ' +
      'it for maintenance.\n\n' +
      'The app works offline for recording, and synchronises when a connection returns. We update ' +
      'the app to fix faults and add features; some updates install automatically and some require ' +
      'you to update from the app store. We may change or discontinue features, and if we withdraw ' +
      'something significant we will give reasonable notice and time to export your data.',
  },
  {
    heading: '9. Limitation of liability',
    text:
      `To the fullest extent permitted by law, ${LEGAL_META.company} is not liable for indirect, ` +
      'incidental, special, punitive or consequential loss, nor for loss of crop, stock, yield, ' +
      'profit, revenue, business, goodwill or data, arising from your use of or inability to use the ' +
      'Service, or from reliance on anything it displays.\n\n' +
      'Nothing in these Terms excludes or limits liability that cannot lawfully be excluded, ' +
      'including for death or personal injury caused by negligence, or for fraud.',
  },
  {
    heading: '10. Ending your use',
    text:
      'You may stop using the Service and delete your account at any time, from Profile → Delete ' +
      'Account. What happens to your data afterwards is set out in section 8 of the Privacy Policy.\n\n' +
      'We may suspend or end access if these Terms are breached, if it is necessary to protect the ' +
      'Service or other users, or if we are required to by law. Except where the breach is serious ' +
      'or we are legally prevented, we will tell you why and give you an opportunity to export your ' +
      'data.',
  },
  {
    heading: '11. Changes to these Terms',
    text:
      'We may update these Terms. If a change is material we will notify you in the app or by email ' +
      'before it takes effect. Continuing to use the Service after that means you accept the ' +
      'updated Terms; if you do not, you may delete your account.',
  },
  {
    heading: '12. Governing law and disputes',
    text:
      `These Terms are governed by the laws of ${LEGAL_META.governingLaw}. The courts at ` +
      `${LEGAL_META.jurisdiction} have exclusive jurisdiction over any dispute arising from them.\n\n` +
      'Before going to court, please write to us. Most problems are a misunderstanding or a bug, and ' +
      'both are quicker to fix by email than by litigation.',
  },
  {
    heading: '13. Contact',
    text:
      `${LEGAL_META.company}\n` +
      `Email: ${LEGAL_META.contactEmail}\n` +
      'Tamil Nadu, India.\n\n' +
      'These Terms are published in English, which is the authoritative version.',
  },
];
