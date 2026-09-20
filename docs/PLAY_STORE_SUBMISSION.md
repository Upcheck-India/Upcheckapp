# Play Store Submission — Neerani

**Status:** NOT ready to submit. `READ_CALL_LOG`/`ANSWER_PHONE_CALLS` removal
(§C0.1), the location/district-picker change (§C0.2), iOS string fixes (§C0.3)
and the photo-deletion fix (F1, gates the deletion answer in Data Safety) are
required before the next submission and are **pending** — being implemented by
other agents against `development`, none merged as of 20 Sep 2026. See
`docs/PLAY_REVIEW_BLOCKERS.md` for the full picture and resubmission order.
**Owner:** Upcheck Technologies Private Limited
**Last updated:** 20 September 2026 (Data Safety corrections, credential
rotation, test-credentials and release-signing notes — see
`docs/superpowers/specs/2026-09-20-compliance-privacy-and-store-readiness-design.md`
§C0.4/§C0.5). The rest of this doc (build/version/artifact details, store
listing copy) is unchanged from 12 September and should be re-verified before
the actual next submission — a new native build will need a new `versionCode`
and artifact link.

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
| Download | https://expo.dev/artifacts/eas/gHjKdNktKRGiODomARpoJ4ocakl7KGZy2JCl9kDb0wk.aab |
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

## ⚠️ Credential rotation — do this before submitting, not after

These were flagged as outstanding at the time this doc was last drafted
(originally noted under "Outstanding before or shortly after launch" below).
Two more were exposed since, in a chat session, and must rotate too — treat
that with the same urgency as a leaked production secret, because it is one:

- [ ] Upstash (Redis) credentials
- [ ] Render account / API credentials
- [ ] `ADMIN_API_KEY` — **rotating this silently stops news ingestion** unless
      QStash schedule `scd_7Afogmoukhds95HQJdULfF27tg5P` is updated in the same
      change
- [ ] Database password
- [ ] Supabase service-role key
- [ ] Brevo API key
- [ ] **Cloudflare R2 access key — exposed in a chat session, rotate now**
- [ ] **PostHog project key — exposed in a chat session, rotate now**

Human task — do it, do not delegate to an agent (an agent should never hold or
transmit the new secret values either). Rotate, redeploy Render with the new
env vars, and confirm the service still boots before considering this closed.

---

## Test credentials for App Access

The app is fully login-gated, so a Play reviewer with no account cannot get
past the sign-in screen and will reject the submission on that basis alone.
Play Console → **App content → App access** needs a working sign-in.

**What the owner must create** (this cannot be an agent action — it is a real
account and real, if synthetic, data):

1. A **dedicated demo account**, not a real farmer's account: e.g. a farm named
   something obviously synthetic ("Demo Farm" / "Reviewer Farm"), created for
   this purpose only, owned by an email or phone number the owner controls.
2. **Plausible but synthetic farm data** in that account before recording
   credentials or taking screenshots — at least one pond, a few days of water
   quality and feed logs, a cycle in progress, so a reviewer (and anyone
   viewing the store screenshots) sees a populated app, not an empty shell.
   Never `test test` values or ponds named `P1 P2 P3` — see the phone-shot-list
   note below; the same account should supply both the reviewer credentials and
   the screenshots.
3. Enter the credentials into Play Console → App content → App access → "All
   or some functionality is restricted" → provide username/password (or the
   sign-in method used, e.g. email OTP needs a documented static fallback,
   since Play reviewers cannot receive a one-time email — check whether Play
   supports an app-side bypass for this account, or use Google sign-in with a
   Google account the owner controls if OTP cannot be reviewed statelessly).

**Placeholders below — the owner fills these in, this doc does not invent
them:**

| Field | Value |
|---|---|
| Demo account email/phone | `<OWNER TO FILL — never a real farmer's credential>` |
| Demo account password / sign-in method | `<OWNER TO FILL>` |
| Demo farm name | `<OWNER TO FILL, e.g. "Demo Farm">` |
| Data populated as of | `<OWNER TO FILL — date>` |

---

## Prerequisites to have ready

| Item | Where it comes from | Status |
|---|---|---|
| Google Play Developer account (one-off $25) | play.google.com/console | you |
| Privacy Policy, publicly reachable URL | `docs/legal/PRIVACY_POLICY.md` → `upcheck.in/privacy` | **done** — verified live 12 Sep 2026, see "After launch" below |
| Data deletion URL | `docs/legal/ACCOUNT_DELETION.md` → `upcheck.in/account-deletion` | **done** — verified live 12 Sep 2026 |
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

Current (`development`, verified 20 Sep 2026): `INTERNET` · `CAMERA` ·
`ACCESS_COARSE_LOCATION` · `READ_PHONE_STATE` · `READ_EXTERNAL_STORAGE` ·
`WRITE_EXTERNAL_STORAGE` · `VIBRATE`. `RECORD_AUDIO` and `READ_CONTACTS` are
stripped (`tools:node="remove"`).

**Done and merged (PRs #169, #170, #171):**
- `READ_CALL_LOG` and `ANSWER_PHONE_CALLS` **removed** — from the manifest and
  from `frontend/plugins/withTruecaller.js`, which re-injects them at prebuild.
  Missed-call verification is gone; Truecaller one-tap, email OTP and Google
  remain. A jest test asserts both files stay clean.
- `ACCESS_FINE_LOCATION` **removed**; `ACCESS_COARSE_LOCATION` stays for the
  optional "detect my district" shortcut (Accuracy.Low).

**These take effect in the next native build (versionCode 14), not over the
air.** Until that build is submitted and rolled out, the Play Store still holds
build 13, which declares all three — see `docs/PLAY_REVIEW_BLOCKERS.md`.

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
| **Location** | **Pending — see below** | — | — | Depends on the district-picker PR landing |
| **Financial info → Other financial info** | **Yes** | No | App functionality | Required |
| Crash logs | Yes | No | Analytics | On by default, switchable off |
| Diagnostics | Yes | No | Analytics | On by default, switchable off |
| App interactions | Yes | No | App functionality, Analytics | **Opt-in only** |
| **Photos** | **Yes** | No | App functionality | Optional. **Deletable: see the flag below — do not answer Yes yet** |
| ~~Voice or sound recordings~~ | **No** | — | — | No audio feature exists |
| Contacts | **No** | — | — | No contacts code exists |
| Messages → Emails | **No** | — | — | Never declare this — see below |
| Messages → SMS or call log | **No** | — | — | Pending §C0.1 removal — see below |

Also tick: **data is encrypted in transit** (yes); **no data is sold**.

> ### ⚠️ "Users can request deletion" — do NOT answer Yes yet
>
> The account-deletion flow itself works today (see the warning further below),
> but the **photo** objects it deletes do not. Health, disease, mortality,
> feedback and profile photos live in Cloudflare R2, and per
> `docs/superpowers/specs/2026-09-20-photos-storage-and-privacy-design.md` (F1),
> deleting a record or an account today does **not** delete the R2 objects.
> **This row must stay pending until F1 ships and is verified in the tree.**
> Answering Yes to data deletion while photos are collected and undeletable is
> a Play Data Safety violation waiting to be found in review.

#### Photos — CORRECTED to collected

`PHOTO_ATTACH_ENABLED = false` only disables the feedback-attach flow in
`ReportIssueScreen.tsx`. Health, disease, mortality and profile photos upload
independently through `features/healthPhoto.ts` → `photoUrls` and are stored in
Cloudflare R2 (per PR #159/#161, already merged to `master`). **Photos must be
declared: Collected, not shared, optional, App functionality.** The prior "No —
attaching is disabled" answer in this doc was wrong for the app as it stands
today, independent of anything still pending.

Deletable-by-user stays **blocked** — see the flag above — until the photo
spec's F1 (record/account deletion actually removing the R2 objects) ships.
As of 20 Sep 2026, F1 has not shipped and is not the subject of an open PR.

#### Location — PENDING, two possible answers depending on which PR lands

Today: `ACCESS_FINE_LOCATION` is declared, `CreateFarmScreen.tsx` reads with
`Location.Accuracy.Balanced` (~100 m) and stores unrounded
`farms.latitude`/`longitude`, read by nothing. §C0.2 of the compliance spec
removes precise location and adds a district picker
(`docs/strategy/farm-location-strategy.md` Option B) — **done, merged 20 Sep
2026 as PRs #170 and #171; reaches Play in build 14.**

- As merged (district picker, optional "detect my district"
  at `Accuracy.Low`, coordinates rounded to ~1 km if captured at all,
  `ACCESS_FINE_LOCATION` removed): declare **Location, not collected** (or
  **Approximate, collected, optional** only if the coarse "detect my district"
  shortcut is kept — do not declare Precise).
- **Do not submit to Play with "Precise location: collected"** — the current
  in-tree declaration — once `master`/`development` no longer requests
  `ACCESS_FINE_LOCATION`. Recheck the manifest at submission time; do not trust
  this document's date.

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

#### Photos — collected (corrected 20 Sep 2026); audio — not collected

Superseded: this doc previously said "Photos — NOT collected" because
`PHOTO_ATTACH_ENABLED = false` disables feedback-report attachments. That was
always incomplete — health, disease, mortality and profile photos upload
independently and always have — see the corrected row and callouts above.
`PHOTO_ATTACH_ENABLED` only ever governed the feedback flow; it was never the
whole Photos answer.

Voice recordings were in the original draft as "only a recorded note". There is
no such feature — no `expo-av`, no `expo-audio`, no recording code anywhere.
`RECORD_AUDIO` is stripped from the manifest (`tools:node="remove"`).

#### Contacts — the old reasoning was wrong

The draft said contacts are "read at pick time, never uploaded". There is no
contacts code in the app at all. `READ_CONTACTS` is an unused manifest
permission. Not-collected is still the right answer, for a different reason.

#### Never declare "Messages → Emails"

Under Play's taxonomy that means the CONTENT of users' email messages. The app
never reads a mailbox. The email ADDRESS belongs under Personal info → Email
address, which is already declared. Ticking this on a farming app invites
scrutiny for a capability that does not exist.

#### "Messages → SMS or call log" — RESOLVED to Not collected (pending §C0.1)

Superseded: this doc previously treated the answer as arguable between
`PSL_SMS_CALL_LOG` (covering `READ_CALL_LOG`) and "not collected". §C0.1 of the
compliance spec settles it — the missed-call verification path that reads the
call log is being removed entirely (Play's [July 2026
policy](https://support.google.com/googleplay/android-developer/answer/17134731)
made `READ_CALL_LOG` for phone verification non-compliant as of 14 August 2026,
and this app's build 13 still declares it). Once that PR lands: **Not
collected.** No SMS permission exists and none is planned. **Merged 20 Sep 2026
(PR #169): the manifest and the prebuild plugin no longer declare either
permission. It reaches Play only in the next native build (versionCode 14) —
do not submit build 13.**

> ### ⚠️ Data deletion — answer is currently BLOCKED, not Yes

>
> A Play Console draft on 12 September had
> `PSL_SUPPORT_DATA_DELETION_BY_USER → DATA_DELETION_NO`, which was wrong at the
> time: it contradicted the live account-deletion URL, and the app genuinely has
> in-app deletion: `DeleteAccountScreen.tsx` → `authStore.deleteAccount()` →
> `ProfilesService.deleteAccount()`, which re-authenticates, removes the Supabase
> auth identity FIRST so a deleted account cannot resurrect itself via the mirror
> trigger, then transactionally deletes `credit_ledgers`, `users` (cascading
> farms → ponds → crops → every log) and `profiles`.
>
> **That is no longer sufficient to answer Yes.** Now that Photos is correctly
> declared as collected (above), "deletable by user" has to be true for photos
> too, and it is not: R2 photo objects survive both record deletion and account
> deletion today (photo spec F1, not shipped). **Keep this answer blocked/No
> until F1 ships and is verified in the tree — answering Yes prematurely is a
> worse Play-review outcome than the delayed badge.**

### Sensitive permission declarations

> ### ⚠️ SUPERSEDED 20 Sep 2026 — do not justify `READ_CALL_LOG`, remove it
>
> The section below reflects the pre-20-Sep decision (keep and justify the
> permission). The compliance spec's owner decision (CD1) reversed this:
> **remove `READ_CALL_LOG` and `ANSWER_PHONE_CALLS` and the missed-call flow
> entirely**, because Play's July 2026 policy update made phone verification a
> non-compliant use of `READ_CALL_LOG` as of 14 August 2026 — writing a
> justification for it now does not fix the underlying non-compliance. See
> `docs/PLAY_REVIEW_BLOCKERS.md`. **Done — merged 20 Sep 2026 as PRs #169, #170
> and #171.** In App content the declaration must be **removed**, not rewritten:
> a bundle with no sensitive permission but a live declaration can still be put
> through the extended review that Play applies to the declaration form. Verify
> the manifest of the submitted bundle at submission time.

Play will ask you to justify sensitive permissions in the **App content →
Sensitive app permissions** section. Once the pending removal above lands,
there is nothing left to justify here — `READ_PHONE_STATE` (kept, for
Truecaller one-tap) does not require a sensitive-permissions declaration.

- ~~**`READ_CALL_LOG` / `ANSWER_PHONE_CALLS`**~~ — being removed, not justified.
  Old justification text kept here only as a record of the prior decision:
  "Phone number verification via the Truecaller SDK, which uses a missed call
  the app must detect. Call log data is never read for any other purpose,
  never stored and never transmitted to our servers. Email and Google sign-in
  are offered as alternatives." Do not paste this into Play Console.
- **`RECORD_AUDIO`** — **do not write a justification for this.** No audio
  feature exists. Stripped from the manifest (`tools:node="remove"`) — **done**.

Expect the pre-C0.1 assumption ("ship with call-log and expect human review, add
days") to no longer apply once §C0.1 lands: no sensitive-permissions review
should be needed at all. The sign-in story after C0.1: Truecaller one-tap when
the app is installed, otherwise email OTP or Google — no phone-number field
that cannot complete. See the design spec §C0.1 for the accepted loss (a
phone-only user with neither Truecaller nor Google cannot self-register).


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
> • Warns when a treatment is logged that names a banned substance
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
device frames. **Shoot from the dedicated demo account** (see "Test credentials
for App Access" above) holding plausible synthetic farm data — never a real
farmer's account, never `test test` or ponds named `P1 P2 P3`. Reviewers look,
and so do farmers.

---

## Submission procedure

### 1. Create the app
Play Console → **Create app**. Name `Neerani`, default language English (India),
type **App**, **Free**. Accept the declarations.

### 2. Complete "App content"
Privacy policy URL · Ads (none) · App access (provide test credentials, see the
"Test credentials" section below — sign-in is required, so **reviewers will be
blocked without them**) · Content rating questionnaire (answer to land on
**18+ / Mature**, not Everyone — matches Terms §1 and Privacy Policy §10) ·
Target audience (**18+**, matching the Terms) · Data safety (table
above) · Government apps (no) · Financial features (**no** — the app tracks a
farmer's own expenses, it does not provide financial services) · Health (no).

### 3. Set up Play App Signing
Accept it when prompted. It is effectively mandatory for new apps and lets Google
re-sign per-device APKs. **This is what triggers the SHA-1 problem above.**

> **Separate release-signing gotcha, not the same issue:**
> `frontend/android/app/build.gradle` has `release { signingConfig
> signingConfigs.debug }` — the release build type is wired to the **debug**
> signing config. EAS overrides this for the artifacts built above (EAS injects
> its own managed-keystore signing), so this doc's build/submit flow is
> unaffected. But **a local `./gradlew assembleRelease` or `expo run:android
> --variant release` on this repo today produces a debug-signed release
> artifact**, not something safe to distribute outside EAS. Flagging for the
> owner to fix in the gradle file directly — out of scope for this doc.

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
2. **Rotate every exposed credential** — see the "⚠️ Credential rotation"
   checklist near the top of this doc (now also includes the R2 access key and
   PostHog key, exposed in a later chat session).
3. ~~**Host both legal documents**~~ — **done.** `upcheck.in/privacy`,
   `upcheck.in/terms` and `upcheck.in/account-deletion` all resolve (verified
   12 Sep 2026).
4. **Confirm `BREVO_API_KEY` is set on Render.** Problem reports now email
   `admin@upcheck.in` on submission. If the key is missing the service logs
   `Email not sent (BREVO_API_KEY missing)` and no-ops — reports still save, but
   nobody is told. `ADMIN_ALERT_EMAIL` overrides the recipient; unset is fine.
5. ~~**Strip `RECORD_AUDIO` and `READ_CONTACTS`** from the manifest~~ — **done.**
   Both carry `tools:node="remove"` in `AndroidManifest.xml` (merged to `master`).
   Confirmed in the tree; not declared in the merged manifest.
6. **Native-speaker review** of the Hindi, Bengali, Tamil, Telugu and Odia copy.
7. `newsTranslatePrompt.ts` re-evaluates 1.7 MB when a news article opens —
   JS-only, ships by OTA whenever convenient.
