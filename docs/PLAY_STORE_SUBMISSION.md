# Play Store Submission — Neerani

**Status:** ready to submit. The artifact is built and the OTA channel is populated.
**Owner:** Upcheck Technologies Private Limited
**Last updated:** 12 September 2026

---

## What you are submitting

| | |
|---|---|
| App name | **Neerani** |
| Package (immutable identity) | `com.upcheck.app` |
| Version | `1.0.0`, versionCode **12** |
| Artifact | Android App Bundle (`.aab`) |
| EAS build | `2631ae7d-9051-41b4-9d9f-188dcf2da753` |
| Built from | `72cd8ac` — includes the onboarding, money, inventory, export and Sentry fixes |
| **Artifact expires** | **7 October 2026** — download and keep a local copy |
| OTA channel | `production`, runtimeVersion `2.0.0` |
| Signing | EAS-managed keystore (`Upcheck-preview` — the label is cosmetic; it is the default Android keystore and MUST stay the same one, or the upload key changes) |

> **Do not submit versionCode 10.** It was built from `adbe723` on 5 September and
> predates the onboarding rework, the daily-logging work, the decision engines and
> every money/inventory/export fix. A reviewer opens the app once and OTA applies on
> the SECOND launch, so build 10 would be reviewed as a two-day-old bundle carrying a
> bug that returned owners to the farm-creation screen on every launch.

The package id stays `com.upcheck.app` deliberately. Play treats it as the app's
identity forever, and both the Google OAuth client and the Truecaller
registration are bound to it plus a signing fingerprint. The user-facing name is
`Neerani`; the id is invisible to farmers.

---

## ⚠️ Read this first — the failure that will not announce itself

**Enabling Play App Signing changes your app's signing fingerprint.** Google
re-signs the bundle with its own key, so the SHA-1 of the app a farmer installs
from Play is **not** the SHA-1 of the AAB you uploaded.

**Google Sign-In and Truecaller are both registered against a SHA-1.** Neither
will work for Play-installed users until the new fingerprint is registered, and
neither fails loudly — the user taps "Continue with Google", nothing happens, and
nobody files a bug.

Your side-loaded APK will keep working the whole time, because it is signed with
the original key. **A passing test on the APK proves nothing about the Play
build.**

### The fix, in order

1. Upload the AAB to **Internal testing** (step 6 below).
2. Play Console → **Setup → App integrity → App signing key certificate**.
   Copy the **SHA-1 certificate fingerprint**.
3. Add it to Google Cloud Console → APIs & Services → Credentials → the Android
   OAuth 2.0 client for `com.upcheck.app`. Keep the existing fingerprint too —
   an OAuth client can hold several, and you still need the old one for
   side-loaded builds.
4. Add it to the Truecaller developer dashboard for the same package.
5. Install **through the Play internal-testing link** — not the APK — and sign in
   with **both** Google and Truecaller before promoting to any wider track.

Do not skip step 5. It is the only test that exercises the real signature.

---

## Prerequisites to have ready

| Item | Where it comes from | Status |
|---|---|---|
| Google Play Developer account (one-off $25) | play.google.com/console | you |
| Privacy Policy, publicly reachable URL | host `docs/legal/PRIVACY_POLICY.md` | **content ready, needs hosting** |
| Data deletion URL | host `docs/legal/ACCOUNT_DELETION.md` | **content ready, needs hosting** |
| App icon, 512×512 PNG | `frontend/assets/` | ready |
| Feature graphic, 1024×500 | — | **to produce** |
| Screenshots, min 2 phone | from the APK on the OPPO | **to capture** |
| Short description (80 chars) | draft below | draft |
| Full description (4000 chars) | draft below | draft |

Both legal URLs must be reachable **before** you submit — Play rejects a listing
whose policy link 404s, and the deletion URL is separately mandatory under the
data-deletion policy.

---

## Data safety form — answer it from this table

Play's Data safety section must match what the app actually does and what the
Privacy Policy says. Mismatches are a common rejection reason, and here the
policy is the source of truth because it is published.

### Permissions declared in the manifest

`INTERNET` · `CAMERA` · `ACCESS_FINE_LOCATION` · `ACCESS_COARSE_LOCATION` ·
`RECORD_AUDIO` · `READ_CONTACTS` · `READ_PHONE_STATE` · `READ_CALL_LOG` ·
`ANSWER_PHONE_CALLS` · `READ_EXTERNAL_STORAGE` · `WRITE_EXTERNAL_STORAGE` ·
`VIBRATE`

### What to declare as collected

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
Verified against the code on 12 September 2026. Three rows changed from the
original draft; the reasons are under the table.

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Name | Yes | No | App functionality, Account management, Developer communications | Required |
| Email address | Yes | No | App functionality, Account management, Developer communications | Required |
| Phone number | Yes (Truecaller / phone sign-in only) | No | App functionality, Account management | Optional — email sign-in avoids it |
| User IDs | Yes | No | Account management, analytics (hashed) | Required |
| **Precise location** | Yes | No | App functionality | Optional |
| **Financial info → Other financial info** | **Yes** | No | App functionality | Required |
| Crash logs | Yes | No | Analytics | On by default, switchable off |
| Diagnostics | Yes | No | Analytics | On by default, switchable off |
| App interactions | Yes | No | App functionality, Analytics | **Opt-in only** |
| ~~Photos~~ | **No** | — | — | Attaching is disabled — see below |
| ~~Voice or sound recordings~~ | **No** | — | — | No audio feature exists |
| Contacts | **No** | — | — | No contacts code exists |
| Messages → Emails | **No** | — | — | Never declare this — see below |

Also tick: **data is encrypted in transit** (yes), **users can request deletion**
(**YES** — see the warning below), and **no data is sold**.

#### Location is PRECISE, not approximate

The manifest declares both `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`,
and Play keys the answer off what you REQUEST. `CreateFarmScreen.tsx` reads with
`Location.Accuracy.Balanced` (~100 m), well inside Google's precise threshold,
and stores the result as `farms.latitude` / `longitude`. So: Precise, collected,
optional, App functionality.

It is optional honestly — a single "Detect location" button on farm creation is
the only location call site in the app, and the farmer can type an address
instead. Say so in the justification; a skippable location permission reviews far
more easily than one on the critical path.

**Worth fixing later:** the stated purpose (farm position for weather, tide and
regional pricing) does not need fine location. Dropping `ACCESS_FINE_LOCATION`
and using `Accuracy.Low` would allow an Approximate-only declaration. That is a
manifest change, so it needs a native build — fold it into the next one.

#### Financial info — changed to YES

The original draft said No, reasoning that farm expenses are never shared. But
the question asks about COLLECTION, not sharing, and collected-not-shared is a
valid answer. Play's *Other financial info* explicitly names **debts**, and
`credit_ledgers` stores `dealerName`, `principal`, `interestPct`, `dueDate` and
`repaid` on our servers. That is debt with interest. Under-declaring is the
riskier error of the two.

Free-text for the "Other" financial features field:

> Bookkeeping for the farmer's own business. Users manually record farm expenses
> and income, and the app calculates per-crop profit, cost per kilogram and
> break-even price. Users can also record credit they have already taken from
> input dealers (dealer name, principal, simple interest rate, due date,
> repayments) to see an outstanding balance. We are not a lender. The app does
> not process payments, store payment methods, or connect to any bank.

"We are not a lender" is load-bearing. The moment Google sees principal, interest
rate and due date, the question becomes whether this is a credit product — which
pulls in Play's financial-services policy and India's personal-loan-app rules, a
far heavier review. Kill that inference explicitly.

#### Photos and audio — NOT collected, and one is fragile

`PHOTO_ATTACH_ENABLED = false` in `ReportIssueScreen.tsx`, so photo attaching is
off and Photos is correctly undeclared. **This is fragile: re-enabling it is a
one-line OTA change that needs no new store submission, and the Data Safety
declaration silently becomes false the moment it ships.** Update Data Safety in
the same change that flips the flag.

Voice recordings were in the original draft as "only a recorded note". There is
no such feature — no `expo-av`, no `expo-audio`, no recording code anywhere.
`RECORD_AUDIO` sits in the manifest unused.

#### Contacts — the old reasoning was wrong

The draft said contacts are "read at pick time, never uploaded". There is no
contacts code in the app at all. `READ_CONTACTS` is an unused manifest
permission. Not-collected is still the right answer, for a different reason.

#### Never declare "Messages → Emails"

Under Play's taxonomy that means the CONTENT of users' email messages. The app
never reads a mailbox. The email ADDRESS belongs under Personal info → Email
address, which is already declared. Ticking this on a farming app invites
scrutiny for a capability that does not exist.

#### "Messages → SMS or MMS" — decide deliberately

There is no SMS permission in the manifest and no SMS-reading code. But Google's
machine id for this response is `PSL_SMS_CALL_LOG`, its combined SMS/call-log
bucket, so ticking it to cover `READ_CALL_LOG` is defensible. Against that: Play
defines *collected* as transmitted off the device, and the call log is read
on-device by the Truecaller SDK to spot the verification call.

Either answer is arguable. **Whichever you pick must match the sensitive-
permissions justification for `READ_CALL_LOG`** — two different stories in two
places is the worst outcome.

> ### ⚠️ Answer YES to data deletion
>
> A Play Console draft on 12 September had
> `PSL_SUPPORT_DATA_DELETION_BY_USER → DATA_DELETION_NO`, which is wrong twice
> over. It contradicts the account-deletion URL supplied two rows earlier
> (`https://www.upcheck.in/account-deletion`, live), and the app genuinely has
> in-app deletion: `DeleteAccountScreen.tsx` → `authStore.deleteAccount()` →
> `ProfilesService.deleteAccount()`, which re-authenticates, removes the Supabase
> auth identity FIRST so a deleted account cannot resurrect itself via the mirror
> trigger, then transactionally deletes `credit_ledgers`, `users` (cascading
> farms → ponds → crops → every log) and `profiles`.
>
> Answering No also forfeits the **Data deletion badge** Google puts on the
> listing.

### Sensitive permission declarations

Play will ask you to justify these two in the **App content → Sensitive app
permissions** section:

- **`READ_CALL_LOG` / `ANSWER_PHONE_CALLS`** — required by the Truecaller SDK for
  missed-call phone verification. Justification: "Phone number verification via
  the Truecaller SDK, which uses a missed call the app must detect. Call log data
  is never read for any other purpose, never stored and never transmitted to our
  servers. Email and Google sign-in are offered as alternatives."
- **`RECORD_AUDIO`** — **do not write a justification for this.** The draft used to
  claim "voice notes attached to a pond record". No such feature exists and no
  audio code is in the app. Together with `READ_CONTACTS`, this is a dead manifest
  permission. Strip both in the next native build rather than justifying a
  capability that isn't there — an unused microphone permission invites exactly
  the question you don't want asked.

Expect this to be reviewed by a human and to add days to the first submission.
If Play pushes back on call-log access, the fallback is to ship without the
Truecaller missed-call path and rely on its one-tap OAuth flow plus email and
Google sign-in.

---

## Store listing drafts

**App name (30 max):**
> Neerani: Shrimp Farm Manager

28/30. "Neerani" alone is 7 characters of a coined word with no search volume,
and Play indexes the title heavily. Appending the category is standard
descriptive naming, not keyword stuffing, and it is the difference between being
found by someone searching "shrimp farm app" and being findable only by people
who already know the name.

**Short description (80 max):**
> Pond logs, water quality, feed and costs — for shrimp farmers, in 6 languages.

78/80. Trades "farm finances" for the shorter "costs" to buy room for the
six-language hook, which is both a real differentiator and search-relevant in
India.

**Full description (~2,400 of 4,000):**

Deliberately not padded to the limit. Play penalises keyword stuffing and nobody
reads four thousand characters.

> Neerani is a farm operations app for shrimp and fish farmers in India.
> Record every pond's water, feed, growth, health and money in one place,
> and see what needs attention before it becomes a problem.
>
> Built for how farms actually run: several ponds at different stages, work
> shared between an owner and hired hands, patchy signal at the pond bank, and a
> team that does not read English.
>
> DAILY LOGGING
> • Water quality — dissolved oxygen, pH, temperature, salinity, ammonia,
>   nitrite, nitrate, alkalinity, hardness and transparency
> • Feed given, meal by meal, with feeding-tray residue checks
> • Mortality, treatments, chemicals and probiotics
> • Log several ponds in one pass instead of opening each one
>
> GROWTH AND HEALTH
> • Sampling for average body weight and daily growth rate
> • Plankton and microbiology records, including Vibrio counts
> • Disease encyclopedia and a symptom-based checker
> • Warnings on banned substances before a treatment goes in the water
>
> DECISIONS
> • Daily feed advice, adjusted for tray residue, water conditions and molt
> • Aeration adequacy and overnight oxygen, with running cost
> • Disease risk based on the signs you have recorded
> • Harvest timing — whether holding the crop another week earns more than it eats
> • Moon phase and molt windows
>
> MONEY
> • Expenses by category, pond and cycle
> • Farm income and expense ledger
> • Dealer credit with interest and repayments
> • Cost per kilo, break-even count, margin and return, cycle by cycle
>
> STOCK AND TEAM
> • Inventory with low-stock alerts before the feed runs out
> • Tasks you can assign, and verify once they are done
> • Roles — owners and managers see the money, workers log the rounds, viewers
>   read only
>
> WORKS WHERE THE SIGNAL DOESN'T
> Ponds are not where the towers are. Log at the pond bank and it syncs when you
> are back in range.
>
> SIX LANGUAGES
> English, हिन्दी, বাংলা, தமிழ், తెలుగు, ଓଡ଼ିଆ
>
> ADVICE THAT DOESN'T GUESS
> Where your readings are thin, Neerani gives a range instead of a falsely
> precise number. Where the data isn't there, it tells you what to measure rather
> than inventing an answer.
>
> Neerani is a decision-support tool. It records what you tell it and highlights
> what may need attention. It is not a substitute for professional or veterinary
> advice, and decisions about your stock remain yours.
>
> From Upcheck Technologies Private Limited.

Keep the disclaimer paragraph. It matches the Terms and it manages expectations
before install rather than after a bad season.

Every water-quality parameter listed above is a real column on
`water_quality_records`. Do not add parameters the app does not record.

### Store assets

| Asset | Spec | Notes |
|---|---|---|
| App icon | 512×512 PNG, ≤1 MB | Export from `frontend/assets/icon.png` |
| Feature graphic | 1024×500 PNG/JPEG | Required. Accent green ground, app name, one line: "Run your shrimp farm from one app". No phone mockup — unreadable at listing size |
| Phone screenshots | 2–8, ≥1080 px per side for promo eligibility | Shot list below |
| Tablet screenshots | 7" and 10" | Capture from a Pixel Tablet emulator. Never upscale phone shots — wrong aspect ratio is rejected and stretched UI looks broken |
| Video | — | Leave blank. An empty field beats a bad video, and it can be added later without resubmitting |

**Phone shot list, in order.** The first two are the only ones most people see:

1. **Pond dashboard** — one pond, real readings, an alert visible
2. **Morning rounds grid** — several ponds logged in one pass (the "that saves me time" shot)
3. **Water quality log** with an out-of-range value flagged
4. **Feed advisor** showing a recommendation *with its confidence chip*
5. **Cycle analysis** — FCR, survival, cost per kg
6. **Money screen** — expenses and income
7. **Disease checker**, or the banned-substance warning
8. **The same screen in Telugu or Tamil** — proves the six-language claim rather than asserting it

Add a short caption band to each; captioned screenshots convert better than bare
device frames. Shoot with a real account holding plausible farm data — never
`test test` or ponds named `P1 P2 P3`. Reviewers look, and so do farmers.

---

## Submission procedure

### 1. Create the app
Play Console → **Create app**. Name `Neerani`, default language English (India),
type **App**, **Free**. Accept the declarations.

### 2. Complete "App content"
Privacy policy URL · Ads (none) · App access (provide test credentials — sign-in
is required, so **reviewers will be blocked without them**) · Content rating
questionnaire · Target audience (18+, matching the Terms) · Data safety (table
above) · Government apps (no) · Financial features (**no** — the app tracks a
farmer's own expenses, it does not provide financial services) · Health (no).

### 3. Set up Play App Signing
Accept it when prompted. It is effectively mandatory for new apps and lets Google
re-sign per-device APKs. **This is what triggers the SHA-1 problem above.**

### 4. Upload the bundle
**Testing → Internal testing → Create new release**, upload the `.aab`.
Release name `1.0.0 (10)`. Write real release notes.

### 5. Add testers
Internal testing takes an email list, up to 100. Add yourself and anyone
field-testing. The opt-in link is on the same page.

### 6. Install from the Play link and test
Install via the internal-testing link on a device that does **not** have the
side-loaded APK. Then work through the checklist below.

### 7. Promote
Internal → Closed (optional) → Production. Google's review of a first submission
typically takes a few days, longer with sensitive permissions.

---

## On-device checklist before promoting

- [ ] **Truecaller login succeeds** (highest risk, silent failure — see SHA-1 above)
- [ ] **Google Sign-In succeeds** (same SHA-1 dependency)
- [ ] Email sign-up, verification mail arrives, and verification completes
- [ ] App name reads **Neerani**; launcher icon correct
- [ ] Notification small icon is a silhouette, not a solid box
- [ ] Reminders: Settings banner reports armed, and one actually fires
- [ ] Cold start on a fresh install feels acceptable on the OPPO
- [ ] Offline: log a record with data off, confirm it syncs when back on
- [ ] Money screen totals with a custom date range spanning a month boundary
- [ ] Farms list: "Include archived farms" returns the archived farm
- [ ] Analytics consent prompt appears once, and declining is not re-asked
- [ ] After granting consent, PostHog receives `$screen` events and identifies a person
- [ ] A deliberate error reaches Sentry **with no phone number, token or money value attached**

---

## Automated submission (optional)

`eas.json` already carries a `submit.production` block targeting the internal
track as a draft. To use `eas submit` you need a Google Play service account:

1. Play Console → **Setup → API access** → create/link a Google Cloud project.
2. Create a service account, grant it **Release manager** on this app.
3. Download the JSON key.
4. Either set `submit.production.android.serviceAccountKeyPath` to its path
   (**never commit the file**), or upload it once with
   `eas credentials` so EAS holds it.
5. `eas submit --platform android --profile production --latest`

Uploading the first release by hand is perfectly reasonable, and arguably better
— you see every form Play asks for rather than discovering them later.

---

## After launch

**Bumping versions.** `autoIncrement` is `true` for the production profile, so
each build takes the next versionCode. Play rejects duplicates, so do not turn
it off.

**Shipping fixes.** JS-only changes go out by OTA to the `production` channel
(`eas update --branch production`) with no Play review. Anything touching native
code, permissions or `android/` needs a new AAB **and** a `runtimeVersion` bump.

**`runtimeVersion` is a hand-maintained literal** (`app.config.ts`, currently
`2.0.0`). Bump it whenever the native project changes. Forgetting is the one way
to ship a poisoned OTA — Expo would serve a bundle importing native code the
installed binary does not have, crashing every user on it with no way to reach
them. The banner above the value in `app.config.ts` says so.

---

## Known limitations shipping in this release

These are deliberate, documented decisions — not oversights.

| Item | Why |
|---|---|
| Maps unused | `react-native-maps` is installed but nothing renders a map. No Google Maps API key needed. |
| Per-notification icons | 50 icon variants are committed but unusable: expo-notifications exposes no JS API for a per-notification small icon. Needs native work. |
| R8 minification off | `proguard-rules.pro` has no Truecaller rules; enabling R8 risks stripping the SDK and breaking auth silently. |
| Account deletion is immediate | No grace period, because that is what the code does. The policy says so plainly rather than promising a recovery window that does not exist. |
| ~~Backend `SENTRY_DSN` unset~~ | **Resolved 7 Sep 2026.** It was already set correctly; the live service reports production events. Two real reporting bugs were found and fixed instead: `captureException` only queues, so `process.exit(1)` dropped every uncaught-exception crash before it sent, and `TypeORMExceptionFilter` was dead code because Nest reverses global filters — pg constraint violations returned bare 500s instead of 409/400. |
| Photo attachments disabled | `PHOTO_ATTACH_ENABLED = false`. The upload code, the `attachmentPaths` field and the `assertOwnsPaths` ownership check all stay, so re-enabling is one boolean. Viewing attachments on existing reports is unaffected. **Update Data Safety in the same change.** |
| Feed logged against non-mass units | There is no unit conversion in the stock path, and `FeedLogScreen` offers every feed-category item regardless of unit — so logging 5 kg against an item measured in bags deducts 5 bags. kg↔g is a clean 1000× fix; kg↔bag needs a kg-per-bag column that does not exist. Needs a product decision, not a patch. |
| Legal docs English only | A mistranslated "consent" or "liability" changes what the document means. The interface is fully localised; the policy says English is authoritative. |

---

## Outstanding before or shortly after launch

1. ~~**Set `SENTRY_DSN` on Render**~~ — **done.** Verified 7 Sep 2026: the live
   service reports production events tagged with the current release.
2. **Rotate every credential pasted into a chat session** — Upstash, Render,
   `ADMIN_API_KEY`, the database password, the Supabase service-role key, Brevo.
   Rotating `ADMIN_API_KEY` silently stops news ingestion unless QStash schedule
   `scd_7Afogmoukhds95HQJdULfF27tg5P` is updated in the same change.
3. ~~**Host both legal documents**~~ — **done.** `upcheck.in/privacy`,
   `upcheck.in/terms` and `upcheck.in/account-deletion` all resolve (verified
   12 Sep 2026).
4. **Confirm `BREVO_API_KEY` is set on Render.** Problem reports now email
   `admin@upcheck.in` on submission. If the key is missing the service logs
   `Email not sent (BREVO_API_KEY missing)` and no-ops — reports still save, but
   nobody is told. `ADMIN_ALERT_EMAIL` overrides the recipient; unset is fine.
5. **Strip `RECORD_AUDIO` and `READ_CONTACTS`** from the manifest in the next
   native build. Both are unused, and both enlarge the Data Safety surface and
   the review questions for no feature.
6. **Native-speaker review** of the Hindi, Bengali, Tamil, Telugu and Odia copy.
7. `newsTranslatePrompt.ts` re-evaluates 1.7 MB when a news article opens —
   JS-only, ships by OTA whenever convenient.
