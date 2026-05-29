# Gate B — OTP Fallback on Non-Truecaller Device (Debug Build)

**Spec:** `truecaller-auth`
**Task:** 14.2 (manual QA gate)
**Build target:** Android debug APK
**Estimated duration:** 15–25 minutes per sub-path

---

## 1. Purpose

Verify the non-Truecaller verification flow end-to-end on a physical Android device that does **not** have the Truecaller app installed, exercising Requirement 6.4 (One-Tap fallback to `PhoneEntrySection` on `ERROR_VERIFICATION_REQUIRED` / `ERROR_TYPE_TC_NOT_INSTALLED` / `ERROR_TYPE_USER_DENIED`), Requirement 8.1 (`OTP_INITIATED` transitions UI to `OtpEntrySection` with a TTL countdown), and Requirement 8.5 (on `VERIFICATION_COMPLETE` the app POSTs `{ accessToken, phoneNumber, firstName, lastName }` to `/auth/supabase/oauth/truecaller` and the backend returns 200 with `{ user, session }`).

---

## 2. Preconditions

| Item | Required value |
|---|---|
| Device | Physical Android phone (emulator will not receive real SMS / missed calls) |
| Android version | 8.0 (API 26) or newer; Android 13+ recommended |
| Truecaller app | **Uninstalled**, OR installed but signed out with cleared data |
| SIM | Real Indian SIM in slot 1, with active SMS + voice service, on a number matching `^[6-9]\d{9}$` |
| Truecaller console | Debug keystore SHA-1 registered for the package id, partner key issued |
| `partnerKey` | Configured in `frontend/android/app/src/main/res/values/strings.xml` (gitignored) |
| Backend | Reachable from the device on the URL the debug build is configured to call (LAN IP or tunnel, **not** `localhost`) |
| Backend env | `TRUECALLER_KEYS_API_URL`, `TRUECALLER_PROFILE_API_URL`, `TRUECALLER_PUBLIC_KEY_TTL_SECONDS`, `TRUECALLER_NONCE_TTL_SECONDS` set per `backend/.env.example` |
| Supabase | Service role key configured; backend can call `supabase.auth.admin.*` |
| Test phone allowlist | If the SIM is one of Truecaller's reserved test numbers, ensure it is provisioned in the partner console — otherwise SMS / missed-call delivery will silently no-op |
| `adb` | Installed on the host, device authorized for USB debugging |

> If any precondition cannot be satisfied, **stop and resolve before proceeding** — failures past this point cannot be distinguished from environmental issues.

---

## 3. Setup

### 3.1 Start the backend

```sh
cd backend
npm run start:dev
```

Confirm the server prints the listening port and that `/auth/supabase/oauth/truecaller` is registered. From the test device's network, `curl https://<backend-host>/health` (or whatever health endpoint exists) should return 200.

### 3.2 Build and install the debug APK

```sh
cd frontend/android
./gradlew :app:installDebug
```

Or, if running through the Metro bundler:

```sh
cd frontend
npm run android
```

### 3.3 Confirm "no Truecaller" state on the device

Connect the device by USB and run:

```sh
adb shell pm list packages | grep -i truecaller
```

Expected output: **empty**. If anything prints, either uninstall the Truecaller app (`adb uninstall com.truecaller` / `com.truecaller.android` etc.) or sign out + clear app data (`adb shell pm clear <package>`).

### 3.4 Tail logs

In a second terminal:

```sh
adb logcat -c
adb logcat | grep -E "TruecallerAuthModule|TruecallerLoginScreen|TruecallerService"
```

Keep this stream visible during the test.

### 3.5 Configure the backend log filter

In a third terminal, tail the backend output. The runbook will instruct you to capture POST bodies and 200 responses from there — redact `accessToken`, `payload`, `signature`, and the middle digits of the phone number before saving.

---

## 4. Test Steps

Execute either 4.A (OTP path) or 4.B (missed-call path) — Truecaller decides which to issue based on backend heuristics, so you may not control which sub-path you get on a given run. Run the test until both sub-paths have been observed at least once across separate sessions. Then run 4.C to cover the returning-user path.

### 4.A — OTP sub-path

1. Open the app and navigate to the auth landing screen, then tap **Continue with Truecaller** (entry point registered in `frontend/src/screens/auth/TruecallerLoginScreen.tsx`).
2. Grant the runtime permission prompts (`READ_PHONE_STATE`, `READ_CALL_LOG`, `ANSWER_PHONE_CALLS` / `CALL_PHONE`).
3. The bridge invokes `TruecallerAuth.authenticate()`. Because Truecaller is not installed, the SDK rejects with `ERROR_TYPE_TC_NOT_INSTALLED` (or `ERROR_VERIFICATION_REQUIRED`). Per Requirement 6.4, `routeOneTapError` in `TruecallerLoginScreen.tsx` flips phase to `manual`.
4. **Verify:** `PhoneEntrySection` (`frontend/src/screens/auth/components/PhoneEntrySection.tsx`) renders with first name, last name, and phone inputs.
5. Enter a first name (1–50 chars), optional last name (0–50 chars), and a valid 10-digit Indian mobile number (`^[6-9]\d{9}$`).
6. Tap submit. The component calls `TruecallerAuth.startManualVerification(phoneNumber, firstName, lastName)`, which routes through `TruecallerAuthModule.startManualVerification` (`frontend/android/app/src/main/java/com/upcheck/app/TruecallerAuthModule.java`) and ultimately `TruecallerSDK.getInstance().requestVerification("IN", phone, callback, activity)`.
7. The SDK emits `OTP_INITIATED` with a `ttl` field (logcat line: `TruecallerVerificationEvent ... event=OTP_INITIATED`).
8. **Verify (Requirement 8.1):** `OtpEntrySection` (`frontend/src/screens/auth/components/OtpEntrySection.tsx`) appears, the TTL countdown decrements every second, and the **Resend OTP** control is disabled while `ttl > 0`.
9. Wait for the SMS to arrive on the device (typically within 30–60 s).
   - If SMS Retriever is configured and the SMS body carries the correct hash, the bridge emits `OTP_RECEIVED` and `OtpEntrySection` auto-fills its input.
   - Otherwise, manually enter the OTP from the SMS.
10. Tap **Verify**. The component calls `TruecallerAuth.verifyOtp(otp, firstName, lastName)`, which in the bridge calls `TruecallerSDK.getInstance().verifyOtp(profile, otp, apiCallback)`.
11. The SDK emits `VERIFICATION_COMPLETE` with an `accessToken` field.
12. **Verify (Requirement 8.5):** the screen POSTs the body
    ```json
    {
      "accessToken": "<redact>",
      "phoneNumber": "+91XXXXXXXXXX",
      "firstName": "<entered>",
      "lastName": "<entered or empty>"
    }
    ```
    to `/auth/supabase/oauth/truecaller`.
13. The backend dispatches into `TruecallerService.verifyAccessToken(accessToken, phoneNumber)` (`backend/src/auth/truecaller.service.ts`), which `GET`s `https://api5.truecaller.com/v1/otp/installation/verify/profile` with `Authorization: Bearer <accessToken>`. The returned phone number is normalized via `TruecallerService.normalizePhone` (strips `+91` / non-digits) and compared against the request body's normalized phone.
14. **Verify:** backend responds **HTTP 200** with `{ message, success: true, user, session }` (matching `POST /auth/supabase/signin` per Requirement 11.5).
15. **Verify:** the app stores the session via `useAuthStore.setSession(...)` and the navigator flips to the authenticated home stack.

### 4.B — Missed-call sub-path

If, after step 4.A.6, the SDK chooses missed-call instead of SMS:

1. The SDK emits `MISSED_CALL_INITIATED` with a `ttl`.
2. **Verify:** the screen renders the **Waiting for missed call** view with the countdown.
3. The test phone receives an incoming call from a Truecaller-controlled number. **Do not answer.** Let it ring; the SDK detects the call signature.
4. The SDK emits `MISSED_CALL_RECEIVED`. The bridge auto-invokes `TruecallerSDK.getInstance().verifyMissedCall(profile, apiCallback)` (`TruecallerAuthModule.java::apiCallback`).
5. The SDK emits `VERIFICATION_COMPLETE` with `accessToken`. The screen POSTs the same body shape as 4.A.12.
6. **Verify:** backend responds **HTTP 200** with `{ user, session }`; app navigates to authenticated home (same as 4.A.14–15).

### 4.C — `PROFILE_VERIFIED_BEFORE` (returning user) sub-path

1. Run 4.A or 4.B once successfully so the device + phone number is now known to Truecaller's cloud.
2. Sign out from the app's logout entry point (which calls `TruecallerAuth.clear()` per task 5.3).
3. Tap **Continue with Truecaller** again. One-Tap still fails (no Truecaller app installed), so the screen falls through to `PhoneEntrySection`. Enter the **same** first name, last name, and phone number as in step 1.
4. Submit. Instead of `OTP_INITIATED`, the SDK emits `PROFILE_VERIFIED_BEFORE` carrying `payload`, `signature`, and `requestNonce`.
5. **Verify:** the screen POSTs
    ```json
    {
      "payload": "<redact>",
      "signature": "<redact>",
      "signatureAlgorithm": "SHA512withRSA",
      "requestNonce": "<redact>",
      "phoneNumber": "+91XXXXXXXXXX",
      "firstName": "<entered>",
      "lastName": "<entered or empty>"
    }
    ```
    to `/auth/supabase/oauth/truecaller`.
6. The backend dispatches into `TruecallerService.verifySignedPayload(...)` (the `payload` branch of `SupabaseAuthController.truecallerOAuth` in `backend/src/auth/supabase-auth.controller.ts`).
7. **Verify:** backend responds **HTTP 200** with `{ user, session }`. The `user.id` MUST equal the one returned in step 1 (account-linking branch idempotence — Requirement 11.x).

---

## 5. Pass Criteria

The gate **PASSES** only if all of the following are true for at least one full run of 4.A or 4.B, plus a successful 4.C:

- [ ] **Requirement 6.4:** `PhoneEntrySection` rendered after `TruecallerAuth.authenticate()` resolved with `successful = false` and one of `ERROR_VERIFICATION_REQUIRED`, `ERROR_TYPE_TC_NOT_INSTALLED`, or `ERROR_TYPE_USER_DENIED`.
- [ ] **Requirement 8.1:** `OtpEntrySection` rendered after `OTP_INITIATED`, with the TTL countdown decrementing and **Resend OTP** disabled while `ttl > 0`.
- [ ] **Requirement 8.5:** the POST body on `VERIFICATION_COMPLETE` contains exactly `accessToken`, `phoneNumber`, `firstName`, `lastName` (no `payload` / `signature` fields).
- [ ] Backend returns **HTTP 200** with `{ user, session }` matching the shape of `POST /auth/supabase/signin`.
- [ ] App navigates to the authenticated home route and the session persists across an app restart.
- [ ] In 4.C, the same `user.id` is returned as in the original 4.A / 4.B run (linking idempotence).

---

## 6. Fail Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| `PhoneEntrySection` shows "Enter a valid 10-digit Indian mobile number" | Phone fails `^[6-9]\d{9}$` (leading `0`, country code typed, fewer/more digits) | Re-enter as a bare 10-digit number starting with 6, 7, 8, or 9 |
| TTL expires before SMS / missed call arrives | Test number not provisioned in Truecaller console, or carrier delay | Register the SIM number in the partner console as a test number, or retry with a different SIM. Do **not** lower the backend's TTL to mask this |
| Backend returns 401 `Phone number mismatch` | Profile API returned a phone different from request body, or normalization differs | Check `TruecallerService.normalizePhone` strips `+91`, `91`, and all non-digits identically on both sides; confirm the SIM the SMS arrived on matches what was typed |
| Backend returns 401 `Invalid access token` | Truecaller's `api5` rejected the token (expired, partner key mismatch, network blocked) | Re-issue verification, confirm partner key and SHA-1 in console, confirm backend can reach `api5.truecaller.com` |
| Backend returns 401 `Invalid signature` (4.C only) | Public key cache stale or `signatureAlgorithm` mismatched | Restart backend to flush key cache, confirm `TRUECALLER_KEYS_API_URL` is reachable |
| Backend returns 401 `Nonce already used` (4.C only) | The screen retried the same `PROFILE_VERIFIED_BEFORE` event | Sign out, clear app data, run a fresh `requestVerification` so the SDK mints a new nonce |
| No SMS arrives at all | SIM in slot 2 only, dual-SIM data routing, or carrier blocking | Move the SIM to slot 1, disable slot 2, retry. If still failing try a different test number |
| SMS arrives but `OtpEntrySection` does not auto-fill | SMS Retriever hash in the SMS does not match the debug-build hash | Either type the OTP manually (still passes the gate), or regenerate the SMS Retriever hash for the debug keystore and update the partner console |
| Permission prompts denied | User dismissed the runtime prompt | Tap **Continue with Truecaller** again and grant the permissions, or grant them via system settings |
| `adb logcat` shows `ERROR_NO_ACTIVITY` | `MainActivity` not in the foreground when the bridge invoked the SDK | Ensure the app is in the foreground when tapping the button; do not lock the screen during the flow |

---

## 7. Evidence to Capture

Save into the spec's QA evidence folder (or attach to the task ticket). **Redact** every secret-bearing field as noted.

1. Screenshot of `PhoneEntrySection` rendered after the One-Tap fallback (proves Requirement 6.4).
2. Screenshot of `OtpEntrySection` with a visible decreasing TTL and a disabled **Resend OTP** control (proves Requirement 8.1).
3. `adb logcat` excerpt showing the `TruecallerVerificationEvent` for `OTP_INITIATED` (with `ttl`) and `VERIFICATION_COMPLETE` — redact `accessToken`, `payload`, `signature`, `requestNonce`; mask phone to last 4 digits.
4. Redacted POST body from the network panel or backend log:
   ```json
   {
     "accessToken": "<REDACTED>",
     "phoneNumber": "+91XXXXXX1234",
     "firstName": "<entered>",
     "lastName": "<entered or empty>"
   }
   ```
5. Redacted backend 200 response showing `{ user: { id, ... }, session: { access_token: "<REDACTED>", ... } }`.
6. Optional: screenshot of the authenticated home route to confirm navigation.

---

## 8. Sign-off

| Field | Value |
|---|---|
| Date (UTC) | |
| Tester name | |
| Device model | |
| Android version / API level | |
| Indian carrier | |
| Test phone last 4 digits | |
| Debug keystore SHA-1 | |
| Backend URL tested against | |
| Backend git SHA | |
| Frontend git SHA | |
| `partnerKey` last 4 chars | |
| Sub-paths exercised | ☐ 4.A OTP &nbsp;&nbsp; ☐ 4.B Missed call &nbsp;&nbsp; ☐ 4.C `PROFILE_VERIFIED_BEFORE` |
| Result | ☐ PASS &nbsp;&nbsp; ☐ FAIL |
| Notes | |

Tester signature: ____________________________

---

### Code paths referenced

- `frontend/src/screens/auth/components/PhoneEntrySection.tsx`
- `frontend/src/screens/auth/components/OtpEntrySection.tsx`
- `frontend/src/screens/auth/TruecallerLoginScreen.tsx` (phase state machine)
- `frontend/android/app/src/main/java/com/upcheck/app/TruecallerAuthModule.java` (`startManualVerification`, `verifyOtp`, `apiCallback`)
- `backend/src/auth/truecaller.service.ts` (`verifyAccessToken`, `verifySignedPayload`, `normalizePhone`)
- `backend/src/auth/supabase-auth.controller.ts` (`truecallerOAuth` — dispatch on `payload` vs `accessToken`)
