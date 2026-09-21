<!-- GENERATED FROM frontend/src/legal/content.ts — DO NOT EDIT BY HAND.
     Run: node scripts/sync-legal-docs.js  (from frontend/) -->

# Privacy Policy

**Upcheck Technologies Private Limited**

Upcheck Technologies Private Limited ("we", "us", "our") operates the Neerani mobile application and any Neerani hardware devices that connect to it (together, the "Service"). Neerani is a farm-management tool for shrimp and aquaculture producers, and is operated by Upcheck Technologies Private Limited.

This policy explains what personal data we collect, why we collect it, who we share it with, where it is kept, and the control you have over it. It is written to be read, not to be survived.

Effective 5 September 2026. Last updated 21 September 2026.

## 1. Who this applies to

Anyone who creates an Neerani account, or who is invited to a farm by an account holder as an owner, manager, worker or viewer. If a farm owner invites you, they decide what you can see and do on that farm, and the farm records you enter belong to that farm — not to you personally. Your own profile details remain yours.

The Service is available across India and, in future, internationally.

## 2. What we collect

Account and identity — your name, email address, and profile photo if you add one. If you sign in by phone, your phone number. Passwords are never stored as text; only a salted hash is kept, which cannot be reversed back into your password.

Sign-in provider data — if you choose Google, we receive the email address, name and picture on that Google account. If you choose Truecaller, we receive your verified phone number and name, and the result of Truecaller's verification. We receive these only when you pick that method; you can use email instead and give us neither.

Farm records you enter — farms, ponds and culture cycles, pond location if you provide it, water-quality readings, feeding, sampling, mortality, chemical, plankton, microbiology, disease and treatment logs, harvests, inventory, expenses, transactions, tasks and simulations. This is the substance of the app and most of it is entered by you.

Photos — only images you choose to attach to a record (a health check, disease log, mortality log or your profile picture are the current uses), either taken with the camera or picked from your library. We do not access your gallery or camera in the background. Photos are converted to WebP format and their embedded metadata — including any location tag your device recorded — is stripped before storage; a small thumbnail is generated alongside the full image. A photo is visible to members of the farm the record belongs to, per their role, and is used only for that record and for exports you generate from it. It is never used to train any model unless you switch on photos under "Help improve Neerani's advice" (section 3), and never to train anyone else's. If we ever build a feature that analyses a photo automatically (for example, image-based disease detection), we will ask for your separate, specific consent before turning it on, and this policy will describe it before it launches.

Team and attendance — who belongs to a farm, their role, and attendance or task records an owner or manager keeps.

Device and technical data — app version, device model, operating system version, language, a push-notification token if you enable notifications, and diagnostic logs. Credentials, tokens and verification codes are stripped from our logs.

Connected Neerani devices — where you use Neerani hardware, the readings it takes (such as dissolved oxygen, pH, temperature and salinity), the pond it is assigned to, and device status such as its identifier, battery level and connectivity.

## 3. What we do with it

We use your data to create and secure your account and confirm who you are; to run the features you came for — storing your records, producing calculations, reports and alerts; to send you transactional messages such as email verification and password resets, and the reminders and alerts you have switched on; to keep the Service working, diagnose faults and improve it; and to meet legal obligations.

Under India's Digital Personal Data Protection Act, 2023, our ground for each of these: your consent, given when you create an account and accept this policy, covers account creation, sign-in, storing the records you enter, running the features you use day to day, and sending transactional messages. Crash reporting and product analytics each rest on their own separate consent — see section 6, where you switch analytics on, and where crash reporting can be switched off. Where you have voluntarily provided data for a specified purpose and have not indicated you do not consent to its use (Section 7(a)) — for example, giving us your phone number to sign in with Truecaller — we rely on that certain legitimate use instead of asking you to consent twice for the same act. Retaining a record to meet a legal obligation, or disclosing data to comply with a court order or a request from a government agency legally entitled to make one, rests on Section 7's legitimate uses for compliance with law.

Improving Neerani's advice (model training) is a separate purpose with its own consent, and it is OFF unless you switch it on in Settings → Privacy → "Help improve Neerani's advice". Farm records and photos are two separate switches: you may allow one and refuse the other. If you allow it, we may use those records or photos to improve the advice the app gives. We never use your name, phone number or money figures for this. Switching it off stops any future use, and a training dataset only ever includes data from people whose switch is on at the time it is built.

What we do NOT do, and will not start doing quietly:
• We do not sell your personal data. Not to anyone, for any price.
• We do not use your data for third-party advertising, and we carry no ad networks.
• We do not share your farm records, harvest volumes, expenses, transactions or prices with other users, buyers, traders or competitors.
• We do not access your photo library, camera or call/phone state for any purpose beyond the specific feature you invoked, described in section 4. We do not read your contacts or messages — the app has no feature that accesses either.
• We do not build advertising or credit profiles about you.

## 4. Permissions, and exactly why each one exists

Every permission below is optional. Android asks you, you may refuse, and you may withdraw consent later in your device settings. Refusing a permission disables the feature that needs it and nothing else — the rest of the app keeps working.

Phone state — used ONLY by Truecaller sign-in, so Truecaller can confirm that the number on this device is genuinely yours. The app no longer asks for call-log or phone-call access at all, and no longer verifies numbers with a missed call. We do not read, store, upload or analyse your call history or contacts list for any purpose of our own, and we never place calls. If you would rather not grant this, sign in with email or Google instead — Truecaller is one option, never a requirement.

Camera — to photograph a pond, a diseased animal or a document and attach it to a record.

Photos and files — to attach an existing image, and to save exports (PDF, CSV, Excel) you ask the app to produce.

Approximate location — only for the optional "Detect my district" shortcut when filling in your farm's district, to pre-fill local weather and prices. We ask for coarse (approximate) location, never precise location, only when you tap that shortcut, and never in the background. You can always pick your district from a list instead and skip this entirely.

Notifications — to deliver the reminders and alerts you configure. A notification's title and body are generated by us but delivered through our push provider (Expo) and your device's operating system (Google or Apple push services), which is how any app delivers a notification. They may appear on your lock screen depending on your device settings.

Other apps on your device — the app checks whether certain apps (such as WhatsApp, a mail app, a dialler or maps) are installed, so that sharing a report or calling a worker opens something that actually exists. We check for a short, specific list. We do not request the ability to see everything installed on your phone.

## 5. Who else is involved

We use service providers who process data on our behalf, under contract, and only on our instructions. Named, with what they handle and where:
• Supabase — authentication and our primary database (account, farm and log records). Singapore.
• Render — hosts our backend servers. Singapore.
• Cloudflare R2 — stores the photos you attach to records. Asia-Pacific region.
• Sentry — crash and error reporting; see section 6. European Union (Germany).
• PostHog — product analytics, only with your consent; see section 6. United States.
• Expo — delivers push notifications and app updates to your device. United States.
• Brevo — sends verification, password-reset and notification emails on our behalf. European Union.

Two providers are involved only because you chose them, and their own terms and privacy policies also apply to that choice:
• Google — if you sign in with Google.
• Truecaller — if you verify your phone with Truecaller.

We may also disclose information where the law requires it, or where it is necessary to protect the rights, safety or security of our users, the public or Neerani. If we are ever compelled to hand over data, we will tell you unless we are legally barred from doing so.

## 6. Crash reports and analytics — what you control

Crash reporting is on by default. When the app or our servers fail, we receive a technical report of the failure so we can fix it. These reports are deliberately stripped: they carry no passwords or session tokens, no phone numbers, no email addresses, and no financial values, harvest figures or farm records. Where an account must be identified at all, it is by an irreversible identifier, never your phone number. We consider this the minimum needed to keep the Service working, and it is the reason a fault can be fixed before you have to report it.

Product analytics is OFF unless you switch it on. It tells us which features are used and where people get stuck, so we build the right things. It is never enabled by default, never pre-ticked, and never inferred from your silence. If you turn it on and later change your mind, switching it off stops collection — it is not a preference we quietly ignore. Your farm records, money and harvest data are never sent to analytics, whatever your setting.

Declining either one does not reduce your access to any feature.

## 7. Where your data is kept

Your data is stored and processed on secure servers located outside India. Your account, farm and log records are held in Singapore (Supabase, Render). Photos are stored with Cloudflare R2 in the Asia-Pacific region. Crash reports are processed in the European Union, and product analytics — only if you have opted in — in the United States. Push notifications and app updates are delivered through Expo in the United States, and transactional email through Brevo in the European Union. We rely on contractual safeguards with our providers for those transfers, and we choose providers who commit to appropriate security and confidentiality standards.

We protect data in transit with encryption (HTTPS), store passwords only as salted hashes, use signed session tokens, and restrict access to the small number of people who need it to operate the Service. No system is perfectly secure, and we will not pretend otherwise.

If a breach affects your personal data, we notify affected users and the Data Protection Board of India without delay, following our internal breach-response runbook. Our internal target is to complete that notification within 72 hours of confirming the breach.

## 8. How long we keep it

How long depends on what it is:
• Account and profile data — while your account is active.
• Farm logs and records (ponds, cycles, water quality, feeding, sampling, mortality, chemical, plankton, microbiology, disease, treatment, harvest, inventory, expenses, transactions, tasks) — while the farm they belong to exists.
• Photos — while the record they are attached to exists. Deleting a record, a farm, or your account queues its photos for removal from storage; a short periodic clean-up job then deletes them, so removal follows shortly after rather than instantly.
• Email verification codes — 10 minutes, then they expire and cannot be reused.
• Photo links (the signed URLs used to view a photo) — 1 hour, then they stop working and a new one is generated on demand.
• Routine encrypted backups — rotated out within 30 days.

When you delete your account, deletion is immediate and cannot be undone. Your sign-in identity is removed first, then your profile and every farm, pond, cycle and log you own. We cannot recover any of it afterwards, so export anything you want to keep BEFORE you delete. Because the action is irreversible, we ask you to re-enter your password (or type a confirmation, where your account has no password) before it proceeds.

Residual copies in our routine encrypted backups are not accessible as an account and cannot be used to restore one.

Two things survive deletion, and you should know it: records we are legally required to retain, kept only for as long as the law requires; and data belonging to a farm you were a member of but did not own, which remains with that farm's owner. Deleting your account removes you, not their farm.

Routine backups are purged on their own cycle, shortly after the deletion window closes.

## 9. Your rights and your control

You can, at any time:
• See and correct your profile in the app.
• Export your farm data as CSV, Excel or PDF and keep your own copy.
• Change your language, notification and reminder settings.
• Turn product analytics on or off.
• Withdraw any device permission in your phone's settings.
• Delete your account from Profile → Delete Account (immediate and irreversible — export first).

Under India's Digital Personal Data Protection Act, you also have the right to: access a summary of the personal data we hold about you and how we process it; have inaccurate or incomplete data corrected or updated; have your data erased once it is no longer needed for the purpose it was collected for; know who else we have shared your data with; get a way to raise a grievance with us; and nominate someone to exercise these rights on your behalf if you become incapacitated or die.

Withdrawing consent. You can withdraw any consent as easily as you gave it:
• Product analytics and crash reporting — switch them off in Settings → Privacy.
• Model training — switch off farm records, photos or both in Settings → Privacy → "Help improve Neerani's advice".
• The core Service — storing your records and running the features you use — cannot run without your data, so withdrawing that consent means closing your account (Profile → Delete Account).
Withdrawal stops future processing for that purpose; it does not undo processing already done. Each time you give or withdraw a consent we record the choice, the date, the policy version and the language it was shown in, so there is a record of what you agreed to.

Write to admin@upcheck.in to exercise any of these. We aim to respond promptly, and in any case no later than 90 days.

If you are unhappy with how we have handled your data, tell us first — we would rather fix it than have you escalate. Contact admin@upcheck.in. You also retain the right to complain to the Data Protection Board of India.

## 10. Age

Neerani is a business tool for adults. You must be at least 18 to hold an account. We do not knowingly collect personal data from anyone under 18, and if we discover that we have, we will delete it. If you believe a minor has given us their data, contact us and we will act.

## 11. Connected Neerani devices

Where you use Neerani hardware with the app, the device sends its readings and status to your account so they appear against the correct pond. That data is treated exactly like the readings you enter by hand: it is yours, it is not sold, and it is not shared with other users.

A device is linked to a pond by you, and can be unlinked by you. If a specific device ever collects a category of data not described in this policy, we will update this policy and tell you before that device starts sending it.

## 12. Changes to this policy

We may update this policy as the Service changes. If a change materially affects your rights or what we collect, we will tell you in the app or by email before it takes effect — not by silently editing this page. The "last updated" date at the top always reflects the current version. When the version changes, the app shows you a short summary of what changed the next time you open it, and records that you have seen it.

## 13. Language, and how to reach us

The app is available in English, Hindi, Bengali, Tamil, Telugu and Odia. This policy is published in English, which is the authoritative version — legal terms translated loosely can change what a document means, and we would rather you have an accurate text you can ask us about than a comfortable one that is wrong. If anything here is unclear in any language, write to us and we will explain it.

Upcheck Technologies Private Limited
Email: admin@upcheck.in
Tamil Nadu, India.
