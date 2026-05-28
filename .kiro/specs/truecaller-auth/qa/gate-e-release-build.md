# Gate E — Release APK (ProGuard + Play App Signing) re-runs Gates A and B

> Manual QA gate. Tester executes the steps below on a real Android device using a signed release APK (or a Play Internal Testing build when Play App Signing is enabled).

---

## 1. Purpose

Confirm that the release build of the Upcheck Android app:

- Preserves the Truecaller SDK classes through ProGuard/R8 minification, so One-Tap and OTP flows behave identically to debug.
- Authenticates against the Truecaller console using the **release** SHA-1 (and the **Play App Signing** SHA-1 when applicable), not the debug SHA-1.
- Does not leak sensitive Truecaller fields into release logcat.

This gate validates **Requirement 4.6** (`requirements.md` §4 acceptance criterion 6 — "THE Upcheck_Android_App's release ProGuard configuration SHALL include keep rules that preserve all classes and interfaces in the package `com.truecaller.android.sdk`."), and re-validates Requirements 6.1, 6.3, 6.4, 8.1, 8.5, 1.2, and 13.1 on the release artifact.

---

## 2. Preconditions

Tick every box before starting. If any box cannot be ticked, stop and resolve it first.

- [ ] **Production signing keystore is available** to the tester or CI, OR Play App Signing is configured for the app and an Internal Testing release-track upload slot is ready.
- [ ] **Release SHA-1 is registered on the Truecaller developer console** for the same package name as `applicationId` in `frontend/android/app/build.gradle` (Requirement 1.2).
- [ ] **If Play App Signing is in use:** the **Play App Signing SHA-1** (the one shown on the Play Console under *Setup → App integrity → App signing*, NOT the upload key SHA-1) is **also** registered on the Truecaller console (Requirement 1.2).
- [ ] **Production `partnerKey` is provisioned** on the Truecaller console for this package + SHA-1 combination. The release variant reads it from `frontend/android/app/src/main/res/values/strings.xml` (or the release-variant override under `src/release/res/values/strings.xml`) — confirm the production value is what ships, not the debug value.
- [ ] **Privacy policy and Terms of Service URLs are live** and reachable from a public network:
  - `https://upcheck.app/privacy`
  - `https://upcheck.app/terms`
- [ ] **Backend is deployed to a reachable URL** (production or staging) and the release build's API base URL points at it.
- [ ] Test device has a **logged-in Truecaller account** for Gate A, AND a **second device without Truecaller** (or with Truecaller logged out) for Gate B.
- [ ] Tester has `adb` on PATH and the device authorised for USB debugging.

---

## 3. Build steps

Run from the repository root unless otherwise noted.

1. **Clean and assemble release.** From `frontend/android/`:
   ```bash
   ./gradlew clean assembleRelease
   ```
   For a Play Internal Testing upload, build an AAB instead:
   ```bash
   ./gradlew clean bundleRelease
   ```

2. **Confirm ProGuard/R8 ran.** The mapping file is only produced when minification is enabled:
   ```bash
   ls -l frontend/android/app/build/outputs/mapping/release/mapping.txt
   ```
   Expected: file exists and is non-empty. If it is missing, `minifyEnabled` is `false` for the release variant — fix `frontend/android/app/build.gradle` before continuing.

3. **Confirm Truecaller keep rules survived.** `frontend/android/app/proguard-rules.pro` must contain a rule that keeps `com.truecaller.android.sdk.**`. Spot-check the mapping file:
   ```bash
   grep -F "com.truecaller.android.sdk" frontend/android/app/build/outputs/mapping/release/mapping.txt
   ```
   Expected: Truecaller SDK class names appear on the **left** side of `->` arrows with their original names preserved (e.g. `com.truecaller.android.sdk.common.TrueProfile -> com.truecaller.android.sdk.common.TrueProfile`). If those classes are mapped to obfuscated names like `a.a.a`, the keep rules are missing or misconfigured — fix `proguard-rules.pro` and rebuild.

4. **Install the signed release APK** on the test device:
   ```bash
   adb install -r frontend/android/app/build/outputs/apk/release/app-release.apk
   ```
   If Play App Signing is in use, instead upload the AAB to the Play Console Internal Testing track, opt the tester in, and install from the Play Store. The remaining gates must run against **that** install, not a locally-signed APK.

5. Record the release **versionCode**, **versionName**, the **release SHA-1**, and (if applicable) the **Play App Signing SHA-1** in the sign-off section below.

---

## 4. Verification — Gate A on release APK

Re-run the Gate A runbook against the release install:

> [`./gate-a-one-tap.md`](./gate-a-one-tap.md)

In addition to that runbook's pass criteria, confirm the following release-specific checks:

- [ ] The Truecaller **bottom sheet appears** when the user taps "Continue with Truecaller". (If it does not appear on release but did on debug, the keep rules likely failed — see §8.)
- [ ] The returned profile populates **`firstName`, `lastName`, `phoneNumber`, `payload`, `signature`, `signatureAlgorithm`, `requestNonce`** — every field is non-null/non-empty and round-trips into the backend successfully. (Field mapping surviving minification proves keep rules covered the SDK's data classes.)
- [ ] `adb logcat` during the flow contains **no** `ClassNotFoundException`, `NoSuchMethodException`, `NoSuchFieldException`, or `VerifyError` referencing `com.truecaller.*`.

---

## 5. Verification — Gate B on release APK

Re-run the Gate B runbook against the release install on a device **without** Truecaller (or with the SDK reporting `isUsable() == false`):

> [`./gate-b-otp-fallback.md`](./gate-b-otp-fallback.md)

In addition to that runbook's pass criteria, confirm the following release-specific checks:

- [ ] `requestVerification` callback fires (proven by the UI advancing past phone entry to OTP entry).
- [ ] The `OTP_INITIATED` and `VERIFICATION_COMPLETE` events emit on the **release JS bundle** (the production Hermes/JSC bundle, not Metro). Watch for them via `adb logcat | grep TruecallerVerificationEvent` or via your in-app event sink.
- [ ] No obfuscation errors in logcat (same as Gate A).
- [ ] The OTP completes end-to-end and the backend issues a session JWT.

---

## 6. Sensitive-field log audit (Requirement 13.1)

With the release APK installed, run:

```bash
adb logcat -c
adb logcat | grep -iE "payload|signature|requestNonce|accessToken"
```

…then reproduce **both** Gate A (One-Tap) and Gate B (OTP) flows end-to-end on the release build.

- **Pass:** no log lines emitted from the app (tag `TruecallerAuthModule` or any package owned by Upcheck) contain those values, full or truncated. Library-internal logs from `com.truecaller.*` that the SDK itself emits do not count against this gate, but anything emitted by `TruecallerAuthModule.java` does.
- **Fail:** any release log line from Upcheck-owned code contains `payload`, `signature`, `requestNonce`, or `accessToken` values. File a bug, then edit `frontend/android/app/src/main/java/com/upcheck/truecaller/TruecallerAuthModule.java` to gate those `Log.*` statements behind `BuildConfig.DEBUG` (or remove them entirely) per Requirement 13.1, and re-run this gate.

Also spot-check that no full phone number appears unmasked in logs from Upcheck-owned code (Requirement 13.3 enforces masking on the backend; the Android module should not log raw numbers either).

---

## 7. Pass criteria

All four must hold for Gate E to pass:

1. Gate A passes on the release APK (§4).
2. Gate B passes on the release APK (§5).
3. No Truecaller-SDK-class obfuscation errors (`ClassNotFoundException`, `NoSuchMethodException`, `NoSuchFieldException`, `VerifyError`) in logcat during either gate.
4. Sensitive-field log audit (§6) is clean.

---

## 8. Fail troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ClassNotFoundException: com.truecaller.android.sdk.<X>` or `NoSuchMethodException` referencing a Truecaller class | ProGuard stripped the SDK | Add `-keep class com.truecaller.android.sdk.** { *; }` (and `-keep interface com.truecaller.android.sdk.** { *; }` if needed) to `frontend/android/app/proguard-rules.pro`, rebuild, redeploy. |
| Bottom sheet appears on debug but **not** on release; no exception in logcat | Release SHA-1 (or Play App Signing SHA-1) not registered on the Truecaller console | Re-register on the console using the SHA-1 from `keytool -list -v -keystore <release.keystore>` for self-signed APKs, or the SHA-1 shown on Play Console *App integrity → App signing* for Play App Signing. |
| Sign-in succeeds on debug but the backend returns **401** on release | The backend's Truecaller verification rejects the partnerKey + SHA-1 combination, or the release variant is using the debug `partnerKey` | Verify the release `strings.xml` ships the production `partnerKey`. Confirm the production `partnerKey` matches the one issued for the release/Play App Signing SHA-1 on the Truecaller console. |
| Profile fields (`firstName`, `lastName`) come back empty even though the bottom sheet appeared | Keep rule covers the top-level SDK class but not its data/model package | Broaden the keep rule to `com.truecaller.android.sdk.**` (note the double-star) and rebuild. |
| `OTP_INITIATED` / `VERIFICATION_COMPLETE` events never reach JS on release only | The event emitter constants or callback class were stripped | Add `-keep class com.upcheck.truecaller.** { *; }` to `proguard-rules.pro` to protect the bridge module itself. |

---

## 9. Sign-off

| Field | Value |
|---|---|
| Date (YYYY-MM-DD) | |
| Tester (name) | |
| Release versionCode | |
| Release versionName | |
| Release SHA-1 | |
| Play App Signing SHA-1 (if used) | |
| Backend URL under test | |
| Device + Android version | |
| Gate A result (PASS / FAIL) | |
| Gate B result (PASS / FAIL) | |
| Sensitive-field log audit (PASS / FAIL) | |
| **Overall Gate E (PASS / FAIL)** | |
| Notes / linked bug tickets | |

Signed: __________________________   Date: __________
