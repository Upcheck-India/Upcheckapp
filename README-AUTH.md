# Authentication Module

This project implements a complete authentication system using NestJS (Backend) and React Native (Frontend) with Supabase as the database and Brevo for transactional emails.

## Features

- **Email/Password Registration & Login**: Secure password hashing with bcrypt.
- **Google OAuth**: Integrated with Google Sign-In for mobile and web.
- **Email Verification**: Sends verification emails upon registration.
- **Password Reset**: Allows users to reset forgotten passwords via email.
- **Session Management**: JWT-based authentication with Access and Refresh tokens.
- **Profile Management**: View and update user profile.

## Backend Setup

1.  **Environment Variables**: Ensure `.env` contains:
    ```env
    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
    JWT_SECRET=...
    BREVO_API_KEY=...
    BREVO_EMAIL_SENDER_NAME=...
    BREVO_EMAIL_SENDER_EMAIL=...
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    FRONTEND_URL=...
    ```

2.  **Database**: Run `backend/database/schema.sql` in your Supabase SQL editor to set up tables.

## Frontend Setup

1.  **Dependencies**: `npm install` in `frontend` directory.
2.  **Environment Variables**: Ensure `.env` (or Expo secrets) contains:
    ```env
    EXPO_PUBLIC_ANDROID_CLIENT_ID=...
    EXPO_PUBLIC_IOS_CLIENT_ID=...
    EXPO_PUBLIC_WEB_CLIENT_ID=...
    ```

## Authentication Flow

1.  **Registration**:
    - User signs up -> Backend creates user in Supabase -> Sends verification email (if enabled).
    - If Google OAuth -> User authenticated via Google -> Backend creates/updates user -> Returns JWTs.

2.  **Login**:
    - User logs in -> Backend verifies credentials -> Returns Access (short-lived) and Refresh (long-lived) tokens.
    - Frontend stores tokens in `AsyncStorage`.

3.  **Token Refresh**:
    - Axios interceptor detects 401 errors.
    - Uses Refresh Token to get new Access Token.
    - If Refresh Token fails, logs user out.

## Key Files

- **Backend**:
    - `auth.service.ts`: Core logic.
    - `jwt.strategy.ts`: Validates Access Tokens.
    - `email.service.ts`: Handles email sending.

- **Frontend**:
    - `AuthContext.tsx`: Manages auth state and provides `login`, `register`, `logout` methods.
    - `api.ts`: Axios instance with interceptors.
    - `screens/auth/`: Login, Register, ForgotPassword screens.


## Truecaller setup

The Truecaller flow uses SDK 2.6.0 (legacy v2.x with Partner Key, not OAuth
3.0). Setup spans the Truecaller developer console, the Android project, and
the backend verifier. Backend env vars and the verification flow are documented
in `backend/README.md` ("Truecaller verification"); this section covers the
console and Android-project steps.

### 1. Register the app on the Truecaller console

Sign in at https://developer.truecaller.com and create an app entry whose
package name is character-for-character identical to the `applicationId`
declared in `frontend/android/app/build.gradle` (currently `com.upcheck.app`).

Register both the debug and release SHA-1 fingerprints on the same app entry.
When Play App Signing is in use, also register the Play App Signing SHA-1.

```bash
# Debug fingerprint (default Android debug keystore)
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android -keypass android | grep "SHA1:"

# Project-bundled debug keystore (used by CI builds)
keytool -list -v \
  -keystore frontend/android/app/debug.keystore \
  -alias androiddebugkey \
  -storepass android -keypass android | grep "SHA1:"

# Release fingerprint (replace path/alias/passwords with your release keystore)
keytool -list -v \
  -keystore /path/to/release.keystore \
  -alias <release-alias> | grep "SHA1:"
```

For Play App Signing, copy the "App signing key certificate" SHA-1 from the
Play Console (Setup → App integrity → App signing). All three fingerprints
(local debug, release upload, Play App Signing) must be registered before the
Truecaller backend will accept payloads from a release build.

### 2. Store the Partner Key

The console issues a 40+ character Partner Key after registration. Place it in
`frontend/android/app/src/main/res/values/strings.xml` as the `partnerKey`
string resource:

```xml
<resources>
  <string name="partnerKey">YOUR_PARTNER_KEY_HERE</string>
</resources>
```

`AndroidManifest.xml` references it as
`<meta-data android:name="com.truecaller.android.sdk.PartnerKey" android:value="@string/partnerKey"/>`.
The file containing the production Partner Key is excluded from version control
via `.gitignore` (Requirement 2.3); commit a placeholder value only.

### 3. Register at least three test phone numbers

Add at least three test phone numbers on the Truecaller console
(Requirement 1.4). These numbers bypass production rate limits and are required
for QA gates A–E. Use real device SIMs or virtual numbers reachable by SMS and
voice for the missed-call fallback.

### 4. Compute the SMS Retriever hash (only if SMS auto-OTP is enabled)

When the SMS Retriever auto-OTP feature is enabled, register the 11-character
SMS Retriever hash for both the debug and release signing keys
(Requirement 1.5). Google's `AppSignatureHelper` is the reference
implementation; the equivalent command-line approach is:

```bash
# Replace <package> with the applicationId (com.upcheck.app) and <keystore>/<alias>
# with the keystore being signed for (debug or release).
keytool -exportcert -alias <alias> -keystore <keystore> | \
  xxd -p | tr -d '[:space:]' | \
  python3 -c "import sys, hashlib, base64; \
sha = hashlib.sha256(bytes.fromhex(sys.stdin.read())).digest(); \
print(base64.b64encode(b'<package> ' + sha)[:11].decode())"
```

Register one hash per signing key (one for debug, one for release upload, and
one for Play App Signing if applicable). Skip this step entirely when SMS
auto-OTP is not enabled; the OTP can still be entered manually in
`OtpEntrySection`.

### 5. Android permissions

`AndroidManifest.xml` declares the install-time permissions required by the
SDK: `INTERNET`, `READ_PHONE_STATE`, `READ_CALL_LOG`, `CALL_PHONE`,
`ANSWER_PHONE_CALLS` (gated to `minSdkVersion=26`), and `RECEIVE_SMS`
(Requirements 3.1–3.3).

The runtime permission helper at
`frontend/src/native/truecallerPermissions.ts` requests the subset that needs
runtime consent before `TruecallerAuth.authenticate()` is invoked
(Requirements 3.4, 3.5):

- `READ_PHONE_STATE` and `READ_CALL_LOG` on Android API 23+.
- `ANSWER_PHONE_CALLS` on API 26+, otherwise `CALL_PHONE` on API ≤25.

If any of these are denied, `TruecallerLoginScreen` surfaces the denial and
does not call into the SDK.

### 6. Backend verification

See `backend/README.md` → "Truecaller verification" for the env vars
(`TRUECALLER_PUBLIC_KEY_TTL_SECONDS`, `TRUECALLER_NONCE_TTL_SECONDS`,
`TRUECALLER_PROFILE_API_URL`, `TRUECALLER_KEYS_API_URL`) and the request/
response shapes for `POST /auth/supabase/oauth/truecaller`.
