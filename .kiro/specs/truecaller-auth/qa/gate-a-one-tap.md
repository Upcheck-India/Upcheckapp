# Gate A — One-Tap on real Truecaller user (debug build)

> **Spec:** `truecaller-auth` · **Task:** 14.1 · **Validates:** Requirements 6.1, 6.3 · **Mode:** Manual QA on physical Android device

## 1. Purpose

Confirm that a logged-in Truecaller user can sign in to Upcheck via the One-Tap bottom sheet and that a successful POST to `POST /api/auth/supabase/oauth/truecaller` returns a Supabase session that the app stores and uses to navigate to the authenticated home route (Requirements 6.1 and 6.3).

## 2. Preconditions

Before starting, confirm every item in this list. If any is missing, stop and resolve it first — most Gate A failures trace back to a violated precondition.

- **Hardware:** A physical Android phone (not an emulator). API level 23+. The phone has working mobile data or Wi‑Fi and the system clock is correct (server payload-expiry is ±10 min, Requirement 9.6).
- **Truecaller app:** Installed from the Play Store, opened at least once, and logged in with one of the registered test phone numbers from the Truecaller developer console. At least three test numbers must be registered for the Upcheck console entry (Requirement 1.4); pick one that you control physically.
- **Truecaller console — package name:** The console app entry's package name is `com.upcheck.app`, character-for-character identical to `applicationId` in `frontend/android/app/build.gradle` (Requirement 1.1).
- **Truecaller console — debug SHA-1:** The local debug-keystore SHA-1 is registered on the console app entry (Requirement 1.2). To list it: `cd frontend/android && ./gradlew signingReport` and copy the `debug` variant's `SHA1` line.
- **Partner Key:** `frontend/android/app/src/main/res/values/strings.xml` contains a non-empty `<string name="partnerKey">…</string>` matching the key issued by the console (Requirements 1.3, 2.1, 2.4). The file is git-ignored — fetch it from the team secret store if missing.
- **Backend reachable:** Either
  - **Local backend:** `cd backend && npm run start:dev` running on `0.0.0.0:8080`. The phone must reach the host (use the host machine's LAN IP, e.g. `http://192.168.1.7:8080/api`), or
  - **Staging backend:** A reachable staging URL with the same controller deployed. Confirm `GET <baseUrl>/health` (or any unauthenticated route) returns 200 from the phone's browser.
- **Frontend points at the chosen backend:** `EXPO_PUBLIC_API_BASE_URL` is set to `<baseUrl>/api` (note the `/api` global prefix from `backend/src/main.ts`). When unset, the app defaults to the production Render URL (`frontend/app.config.ts`), which is **not** what we want for this gate.
- **Toolchain:** Node 18+, npm 9+, JDK 17, Android SDK + platform-tools on `PATH`, `adb` sees the device (`adb devices` lists it as `device`, not `unauthorized`).

## 3. Setup

### 3.1 Start the backend

```bash
cd backend
npm install            # first run only
npm run start:dev
```

Wait for `Backend listening on 0.0.0.0:8080`. Keep this terminal open and watch its log stream during the test.

### 3.2 Point the app at the backend

Pick **one** of the following depending on how you build:

- **Expo CLI / dev client:** export the env var in the same shell that runs the build, e.g.
  ```bash
  export EXPO_PUBLIC_API_BASE_URL="http://192.168.1.7:8080/api"
  ```
  Replace the IP with your host machine's LAN IP. The phone and host must be on the same network.
- **Plain Gradle install:** add the same value to your shell before running Gradle so the JS bundle picks it up at build time.

Sanity check from the phone's browser: `http://<host>:<port>/api` should respond (any HTTP status, even 404, proves reachability).

### 3.3 Install the debug APK

Use whichever flow your environment supports:

```bash
# Option A — Expo dev build
cd frontend
npx expo run:android --variant debug

# Option B — Pure Gradle
cd frontend/android
./gradlew installDebug
```

Verify the install:
```bash
adb shell pm list packages | grep com.upcheck.app
```

### 3.4 Launch and reach the Truecaller screen

1. Open the Upcheck app.
2. From the email-login screen, tap **Continue with Truecaller**. (`LoginScreen.tsx` calls `navigation.navigate('TruecallerLogin')`, which renders `TruecallerLoginScreen` per `RootNavigator.tsx`.)
3. Confirm the header reads "Sign in with Truecaller" and the One-Tap entry button is visible.

### 3.5 Start logcat in a side terminal

```bash
adb logcat -c   # clear buffer
adb logcat | grep -E "TruecallerAuthModule|ReactNativeJS|OkHttp"
```

Keep this running through the test. The runbook references specific log lines below.

## 4. Test steps

1. On the auth entry screen tap **Continue with Truecaller**. The screen calls `requestTruecallerPermissions()` first (`TruecallerLoginScreen.tsx` `handleStartAuth`).
2. Confirm Android shows runtime-permission prompts for `READ_PHONE_STATE`, `READ_CALL_LOG`, and `ANSWER_PHONE_CALLS` (API 26+) or `CALL_PHONE` (API ≤25). Grant **all** of them. (Requirement 3.4.) If any is denied the screen surfaces a banner and aborts before calling `authenticate()` — re-grant in **Settings → Apps → Upcheck → Permissions** and retry.
3. Confirm the Truecaller bottom sheet animates up from the bottom of the screen within ~2 seconds and shows the test profile (name, phone, "Continue as <Name>" CTA).
4. Tap **Continue** on the bottom sheet. The native bridge resolves `authenticate()` with `{ flow: "ONE_TAP", successful: true, ...payload, signature, requestNonce }` (`TruecallerAuthModule.java` `onSuccessProfileShared`).
5. In the network/log stream, observe a single request:
   ```
   POST <baseUrl>/api/auth/supabase/oauth/truecaller
   Body keys: payload, signature, signatureAlgorithm, requestNonce, phoneNumber, firstName, lastName
   ```
   The screen builds this body in `TruecallerLoginScreen.tsx` `handleStartAuth` (Requirement 6.2).
6. The backend (`backend/src/auth/supabase-auth.controller.ts` `truecallerOAuth` → `truecaller.service.ts` `verifySignedPayload`) must respond **HTTP 200** with body `{ message, user, session }` matching `POST /auth/supabase/signin` (Requirement 11.5).
7. The app stores the session via `useAuthStore.setSession(session)`; `RootNavigator` swaps to the authenticated stack and the user lands on the home route (Requirement 6.3).

## 5. Pass criteria

The gate passes only if **all** of the following are true:

- The Truecaller bottom sheet appeared within ~2 s of tapping Continue with Truecaller.
- The network request to `/api/auth/supabase/oauth/truecaller` returned HTTP 200 with a non-null `session` field.
- The app navigated automatically to the authenticated home route without manual back-navigation.
- `SupabaseAuthContext` / `useAuthStore` reports `isAuthenticated === true` (verify by relaunching the app — it must skip the login screen).
- **Sensitive-field log check (parity with Requirement 13.1):** even though this gate runs on a debug build, scan the logcat output captured in §3.5 and the backend log for the literal values of `payload`, `signature`, `requestNonce`, and the full `phoneNumber`. Backend logs must show only the masked phone (`+91XXXXXX1234` style, Requirement 13.3). Native module logs must not contain the raw values. Note any leak in the sign-off section — the release-build run in Gate E will fail otherwise.

## 6. Fail troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Bottom sheet never appears; `authenticate()` returns `error: "ERROR_PROFILE_NOT_FOUND"` or `"ERROR_TYPE_UNAUTHORIZED_USER"` | Debug SHA-1 not registered on Truecaller console, or package name mismatch | Run `./gradlew signingReport` in `frontend/android/`, copy the debug SHA-1, register it on the Truecaller console app entry. Confirm the console package name is exactly `com.upcheck.app`. |
| Bottom sheet flashes and disappears | Truecaller app installed but not logged in on this device | Open Truecaller, complete its onboarding, sign in with the registered test number, retry. |
| `isUsable()` returns `false` / no bottom sheet attempted | `partnerKey` resource missing or empty (Requirement 2.4) | Open `frontend/android/app/src/main/res/values/strings.xml` and confirm `partnerKey` is non-empty. Reinstall the APK after editing. |
| No runtime permission prompt | `AndroidManifest.xml` missing `READ_PHONE_STATE` / `READ_CALL_LOG` / `ANSWER_PHONE_CALLS` / `CALL_PHONE`, or the app already has them granted | Inspect `frontend/android/app/src/main/AndroidManifest.xml`, confirm Requirements 3.1–3.3 declarations are present. If permissions were granted on a previous run, that is fine — proceed. |
| Backend returns 401 `Invalid signature` | Truecaller public-key cache miss, or signature actually mismatched | Check backend log for "Invalid signature" line. Restart the backend to force a key-cache refresh from `https://api4.truecaller.com/v1/key`. Verify host system clock — keys rotate. |
| Backend returns 401 `Payload expired` | Phone or backend host clock skew >10 min (Requirement 9.6) | Sync NTP on both. |
| Backend returns 401 `Nonce already used` | This `requestNonce` was already consumed in a prior run within the last ≥600 s (Requirement 9.7) | Restart the backend (in-memory nonce store clears) **or** re-run the One-Tap flow to fetch a fresh `requestNonce` and retry. |
| Backend returns 401 `Invalid request` | DTO validation failed — body missing `payload`/`signature`/`requestNonce`/`phoneNumber` or both `payload` and `accessToken` were sent | Inspect the captured request body. The native bridge populates all four fields on `onSuccessProfileShared` — a missing one usually means the SDK callback failed and the screen routed via the wrong branch. |
| App reaches the verifying spinner and never returns | Backend not reachable from the phone | Open `<baseUrl>/api` in the phone's browser. If unreachable, fix the LAN IP / firewall, or switch to staging. |
| Test number not recognized inside Truecaller | Number was not registered on the console for this app entry | Re-register on the Truecaller developer console under "Test phone numbers" (Requirement 1.4); wait a few minutes for propagation. |

## 7. Evidence to capture

Attach all four artifacts to the sign-off:

1. **Bottom-sheet screenshot.** Phone screenshot showing the Truecaller bottom sheet open over the Upcheck app, with the test profile name and CTA visible.
2. **Authenticated-home screenshot.** Phone screenshot of the home route reached after the One-Tap completes, proving navigation succeeded.
3. **Redacted network log of the 200 response.** Curl-style or DevTools-style snippet, with `payload`, `signature`, `requestNonce`, and full `phoneNumber` redacted, e.g.:
   ```
   POST /api/auth/supabase/oauth/truecaller HTTP/1.1
   → 200 OK
   {
     "message": "Truecaller authentication successful",
     "user": { "id": "…uuid…", "email": null, "phone": "+91XXXXXX1234" },
     "session": { "access_token": "<redacted>", "refresh_token": "<redacted>", "expires_in": 3600 }
   }
   ```
4. **Logcat snippet** showing the native callback firing followed by the One-Tap success emission. Example:
   ```
   D TruecallerAuthModule: onSuccessProfileShared
   I ReactNativeJS: { flow: 'ONE_TAP', successful: true, … }
   ```
   Capture from the buffer started in §3.5 and trim to the relevant ~10 lines. Redact any phone-number value before pasting.

## 8. Sign-off

| Field | Value |
| --- | --- |
| Date (UTC) | |
| Tester name | |
| Device model | |
| Android version / API level | |
| Truecaller app version | |
| Upcheck APK build (`versionCode`/git SHA) | |
| Debug SHA-1 used | |
| Backend URL | |
| Test phone number used (last 4 digits only) | |
| Result | ☐ PASS  ☐ FAIL |
| Sensitive-field log scan clean? | ☐ YES  ☐ NO (note details) |
| Notes / deviations | |
| Linked Gate B run | |

## References

- `frontend/src/screens/auth/TruecallerLoginScreen.tsx` — screen under test; owns the FSM and the POST body composition.
- `frontend/android/app/src/main/java/com/upcheck/app/TruecallerAuthModule.java` — native bridge; emits `flow=ONE_TAP, successful=true` on `onSuccessProfileShared`.
- `backend/src/auth/supabase-auth.controller.ts` — `POST /auth/supabase/oauth/truecaller` route handler.
- `backend/src/auth/truecaller.service.ts` — `verifySignedPayload` server-side verifier (signature, nonce, replay).
- `.kiro/specs/truecaller-auth/requirements.md` §6, §11, §13 — acceptance criteria referenced above.
- `.kiro/specs/truecaller-auth/design.md` "Manual QA Gates A–E" — companion gate definitions.
