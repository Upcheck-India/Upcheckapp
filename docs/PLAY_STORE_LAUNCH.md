# Upcheck — Google Play Launch Guide & Checklist

App ID: `com.upcheck.app` · Version `1.0.0` · Owner: `utpl-in` (EAS) · Expo project `f3274022-ae8a-4be6-9085-23f935542a4c`

This is the operator checklist for shipping Upcheck to the Play Store. Items marked **[BLOCKER]** can get the app rejected; **[FILL]** needs your input.

---

## 0. ✅ [RESOLVED] Restricted permissions removed
The restricted `READ_CALL_LOG`, `RECEIVE_SMS`, `CALL_PHONE`, and `ANSWER_PHONE_CALLS` permissions have been **removed** from `frontend/android/app/src/main/AndroidManifest.xml` and from the runtime requests in `src/native/truecallerPermissions.ts`. Only the normal `READ_PHONE_STATE` remains, which is sufficient for **Truecaller One-Tap**. Phone sign-in still works via One-Tap; users can also sign in with email, Google, or the in-app **email OTP**.

> ⚠️ **Do not run `expo prebuild` without re-stripping.** `android/` is committed (bare workflow), so EAS uses the manifest as-is. If anyone regenerates native code via prebuild, the `@dhana-cs/react-native-truecaller` `withTruecaller` plugin will re-inject CALL_LOG/SMS — re-remove them (or patch the plugin) before building.
>
> Remaining manifest permissions worth a quick sanity check for your use case: `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` are present (likely pulled in by a dependency). They are not *restricted* like CALL_LOG/SMS, but remove them if no feature uses them, to minimise review friction and the Data Safety surface.

---

## 1. [BLOCKER] Privacy Policy & Data Deletion URLs
- Host `docs/legal/PRIVACY_POLICY.md` at a public URL → Play Console → **Store listing → Privacy policy**.
- Host `docs/legal/ACCOUNT_DELETION.md` at a public URL → Play Console → **App content → Data deletion**.
- In-app: Privacy/Terms are reachable at **Settings → Privacy Policy / Terms of Service**; **account deletion** at **Profile → Delete Account** (both implemented).
- (Easiest hosting: publish the two markdown files via the existing `UPCHECKSITE` project, GitHub Pages, or any static host.)

## 2. [BLOCKER] Data Safety form (App content → Data safety)
Declare the following (matches `PRIVACY_POLICY.md`):

| Data type | Collected | Shared | Purpose | Notes |
|---|---|---|---|---|
| Email address | Yes | No | Account mgmt, comms | Required |
| Name | Yes | No | Account mgmt | |
| Phone number | Yes* | No | Account mgmt / verification | *only if phone sign-in used |
| User IDs | Yes | No | Account mgmt | |
| Photos | Yes* | No | App functionality | *if user attaches images |
| Approx/precise location | Yes* | No | App functionality | *farm GPS the user enters |
| App activity / in-app actions | Yes | No | Analytics/app function | farm logs you enter |
| Crash logs & diagnostics | Yes | No | Diagnostics | redacted of secrets |
| Push token (Device ID) | Yes | No | Push notifications | |

Also declare: **encrypted in transit = Yes**; **users can request deletion = Yes** (link the deletion URL); **data collection, not just shared**. No data sold; no third-party advertising.

## 3. [BLOCKER] Technical / build
- **Target API level** must meet Play's current minimum (set `android.targetSdkVersion` accordingly in the Expo config / build). Verify before upload.
- Build a signed **AAB**: `eas build -p android --profile production` (EAS manages the upload keystore) — see `frontend/eas.json`.
- If using Play App Signing, register the **app-signing SHA-1** with Truecaller console too (if keeping Truecaller One-Tap).
- Bump `version`/`versionCode` per release in `app.config.ts`.
- Set all production env vars (`EXPO_PUBLIC_API_BASE_URL`, Supabase, Google client IDs, Truecaller client ID) for the production build.

## 4. Content rating
Complete the **content rating questionnaire** (App content → Content ratings). Upcheck is a productivity/business tool with no objectionable content → expected **Everyone / PEGI 3**.

## 5. [FILL] Store listing copy
- **App name:** `Upcheck — Shrimp Farm Manager` (≤30 chars: "Upcheck: Shrimp Farming")
- **Short description (≤80):** `Manage shrimp ponds, water quality, feed, harvests, finance & alerts.`
- **Full description (≤4000):**
  > Upcheck is a complete shrimp-aquaculture management app for Indian farmers. Track multiple farms, ponds and culture cycles; log daily water quality, feed, sampling, mortality, plankton, microbiology, disease and treatments; and get instant alerts when readings cross safe thresholds.
  >
  > Built-in calculators (FCR, ADG, survival rate, daily feed, free ammonia, product dosage, biomass, growth projection & expected harvest), what-if simulations, and production/finance reports help you make better decisions. Manage inventory and expenses, plan harvests, and browse the disease encyclopedia.
  >
  > Sign in with email, Google, or phone, secure your account with two-factor authentication, and use the app in **English, Hindi, Tamil, Telugu, Bengali and Odia**. Your data is private — we never sell it.
- **Category:** Business (or Productivity). **Tags:** aquaculture, farming.
- **Contact:** `[support@yourdomain.com]`, website `[https://yourdomain.com]`.

## 6. [FILL] Graphic assets (upload in Store listing)
- **App icon** 512×512 PNG (have `frontend/assets/` icon — export at 512).
- **Feature graphic** 1024×500 PNG. **[CREATE]**
- **Phone screenshots** — 2–8, 16:9 or 9:16 (e.g. Dashboard, Pond dashboard, Water-quality log, Calculators, Reports, Language picker). **[CAPTURE]**
- (Optional) 7"/10" tablet screenshots.

## 7. Pre-launch checklist
- [ ] Restricted permissions resolved (Section 0).
- [ ] Privacy Policy URL + Data Deletion URL live and entered.
- [ ] Data Safety form completed & matches policy.
- [ ] Account deletion works in-app (Profile → Delete Account) — verified.
- [ ] Target SDK meets Play minimum; signed AAB uploaded to a track.
- [ ] Content rating completed.
- [ ] Store listing text + all graphic assets uploaded.
- [ ] Production backend reachable; health check `GET /api/health` green; DB migrations applied on deploy.
- [ ] Test the signed build via Internal testing track (sign-up, login, a log entry, language switch, delete account).
- [ ] App access: provide Play reviewers test credentials (Console → App content → App access) since the app is login-gated.

## 8. Where things live in the repo
- Legal copy (in-app source of truth): `frontend/src/legal/content.ts`
- Legal screens: `frontend/src/screens/legal/` (+ Settings links)
- Account deletion: `Profile → Delete Account` → `authStore.deleteAccount()` → `DELETE /api/profiles/me` (cascades owned data + removes Supabase auth user)
- Hosted legal/deletion docs: `docs/legal/*.md`
- Android manifest/permissions: `frontend/android/app/src/main/AndroidManifest.xml`
- Build config: `frontend/app.config.ts`, `frontend/eas.json`
