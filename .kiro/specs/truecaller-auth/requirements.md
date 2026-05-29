# Requirements Document

## Introduction

This feature integrates Truecaller SDK 2.6.0 (legacy v2.x with Partner Key, not OAuth 3.0) into the Upcheck React Native Android app to enable phone-number-based authentication for the Indian market. The integration MUST support two user flows from a single SDK configuration (`SDK_OPTION_WITH_OTP`):

- **Flow A — One-Tap**: Users with the Truecaller app installed and logged in see a bottom sheet, tap "Continue", and the app receives a profile plus a server-signed payload in approximately two seconds, with no OTP step.
- **Flow B — Manual / OTP fallback**: Users without the Truecaller app enter their phone number and complete verification through a missed call, SMS OTP, or WhatsApp IM OTP that Truecaller's backend selects per request.

The integration spans an Android native bridge (Java module + package), a React Native JS wrapper, two new screens (phone entry, OTP entry), and a backend signature-verification endpoint that issues a Supabase session and links or creates a user record. Server-side signature validation is mandatory because the client-side success response is spoofable. The existing email/password and Google OAuth flows in the app remain available as fallbacks.

## Glossary

- **Truecaller_SDK**: The Android library `com.truecaller.android.sdk:truecaller-sdk:2.6.0` initialized with a Partner Key, providing the bottom-sheet One-Tap flow and the OTP/missed-call verification flow.
- **Partner_Key**: The 40+ character secret string issued by the Truecaller developer console identifying the registered Upcheck app to Truecaller's servers. Stored in `android/app/src/main/res/values/strings.xml` and referenced from `AndroidManifest.xml` via `@string/partnerKey`.
- **TruecallerAuthModule**: The Android native bridge class (`com.upcheck.app.TruecallerAuthModule`) that extends `ReactContextBaseJavaModule` and wraps the Truecaller SDK for React Native.
- **TruecallerAuthPackage**: The Android `ReactPackage` implementation that registers `TruecallerAuthModule` with React Native.
- **TruecallerAuth_JS**: The React Native JavaScript wrapper module (`TruecallerAuth.js`) that exposes `isUsable`, `authenticate`, `startManualVerification`, `verifyOtp`, and `clear` to application code.
- **TruecallerEvents**: The `NativeEventEmitter` channel `TruecallerVerificationEvent` over which `TruecallerAuthModule` emits progress events (`OTP_INITIATED`, `OTP_RECEIVED`, `MISSED_CALL_INITIATED`, `MISSED_CALL_RECEIVED`, `VERIFICATION_COMPLETE`, `PROFILE_VERIFIED_BEFORE`, `VERIFICATION_FAILED`).
- **TruecallerLoginScreen**: The React Native screen that triggers `authenticate()`, hosts `PhoneEntrySection` and `OtpEntrySection`, and orchestrates the end-to-end client flow.
- **PhoneEntrySection**: The UI section of `TruecallerLoginScreen` that collects the user's first name, last name, and 10-digit Indian mobile number when the One-Tap flow is unavailable.
- **OtpEntrySection**: The UI section of `TruecallerLoginScreen` that collects the OTP, displays a TTL countdown, and supports auto-fill from `TYPE_OTP_RECEIVED` events.
- **TruecallerService**: The NestJS backend service (`backend/src/auth/truecaller.service.ts`) responsible for verifying signed payloads and exchanging access tokens with Truecaller's APIs.
- **TruecallerAuthEndpoint**: The HTTP endpoint `POST /auth/supabase/oauth/truecaller` on the NestJS backend that consumes the client payload and returns a Supabase session.
- **Signed_Payload**: The tuple `(payload, signature, signatureAlgorithm, requestNonce)` returned by `Truecaller_SDK` for One-Tap flows. The `payload` is base64-encoded JSON containing the profile, request nonce, and request timestamp.
- **Access_Token**: The token returned by `Truecaller_SDK` event `TYPE_VERIFICATION_COMPLETE` in the OTP/missed-call flow, exchangeable server-to-server for the user profile.
- **Request_Nonce**: A per-request identifier embedded in `Signed_Payload` and reported separately by the SDK; used to prevent replay attacks.
- **Truecaller_Public_Keys**: The RSA public keys served by `https://api4.truecaller.com/v1/key`, used to verify `signature` against `payload`.
- **Supabase_Session**: The `{ access_token, refresh_token, expires_at, user }` object returned by Supabase after `TruecallerService` invokes the existing `signInWithTruecaller` flow, identical in shape to sessions issued by email/password or Google OAuth login.
- **Privacy_Policy_URL**: The HTTPS URL pointing to the live Upcheck privacy policy, configured in `TruecallerSdkScope.Builder.privacyPolicyUrl(...)`.
- **Terms_Of_Service_URL**: The HTTPS URL pointing to the live Upcheck terms of service, configured in `TruecallerSdkScope.Builder.termsOfServiceUrl(...)`.
- **TTL**: The validity window in seconds returned by Truecaller in `TYPE_OTP_INITIATED` and `TYPE_MISSED_CALL_INITIATED` events during which the verification attempt remains active.

## Requirements

### Requirement 1: Truecaller Developer Console Configuration

**User Story:** As an Upcheck developer, I want the Truecaller developer console to be configured with the Upcheck app's identity, so that the SDK can authenticate the app and serve verifications to real and test users.

#### Acceptance Criteria

1. THE Upcheck_Project SHALL register an app entry on the Truecaller developer console whose package name is character-for-character identical to the `applicationId` declared in `frontend/android/app/build.gradle`.
2. THE Upcheck_Project SHALL register the debug build's SHA-1 fingerprint and the release build's SHA-1 fingerprint (including the Play App Signing SHA-1 when Play App Signing is in use) on the same Truecaller console app entry.
3. THE Upcheck_Project SHALL obtain a Partner_Key from the Truecaller console after registration completes.
4. THE Upcheck_Project SHALL register at least three test phone numbers on the Truecaller console for use during development and QA.
5. WHERE the SMS Retriever auto-OTP feature is enabled, THE Upcheck_Project SHALL register the 11-character SMS Retriever hash for both the debug and release signing keys on the Truecaller console.

### Requirement 2: Secret Management for Partner Key

**User Story:** As an Upcheck developer, I want the Partner Key to be loaded by the app at runtime without being committed to the public repository, so that the key is not leaked to anyone reading the source code.

#### Acceptance Criteria

1. THE Upcheck_Android_App SHALL store the Partner_Key in `android/app/src/main/res/values/strings.xml` as the string resource `partnerKey`.
2. THE AndroidManifest.xml SHALL declare a `<meta-data>` element with `android:name="com.truecaller.android.sdk.PartnerKey"` and `android:value="@string/partnerKey"`.
3. THE Upcheck_Repository SHALL exclude the file containing the production Partner_Key from version control via `.gitignore`.
4. IF the Partner_Key string resource is missing or empty when the application starts, THEN THE TruecallerAuthModule SHALL log an initialization failure and SHALL cause `TruecallerAuth_JS.isUsable()` to resolve to `false`.

### Requirement 3: Android Permissions and Host Activity

**User Story:** As an Upcheck Android user, I want the app to request only the phone permissions that Truecaller's OTP fallback flow actually needs and to do so at the moment authentication starts, so that I am not prompted unnecessarily and the verification flow can complete.

#### Acceptance Criteria

1. THE AndroidManifest.xml SHALL declare the `INTERNET`, `READ_PHONE_STATE`, `READ_CALL_LOG`, and `CALL_PHONE` permissions.
2. WHERE the device runs Android API level 26 or higher, THE AndroidManifest.xml SHALL declare the `ANSWER_PHONE_CALLS` permission.
3. WHERE the SMS Retriever auto-OTP feature is enabled, THE AndroidManifest.xml SHALL declare the `RECEIVE_SMS` permission.
4. WHEN the user initiates the Truecaller authentication flow on a device running Android API level 23 or higher, THE TruecallerLoginScreen SHALL request the runtime permissions `READ_PHONE_STATE` and `READ_CALL_LOG`, plus `ANSWER_PHONE_CALLS` on API level 26 or higher or `CALL_PHONE` on API level 25 or lower, before invoking `Truecaller_SDK.authenticate()`.
5. IF the user denies any of the requested runtime permissions, THEN THE TruecallerLoginScreen SHALL display a message that explains which permission was denied and SHALL NOT invoke `Truecaller_SDK.authenticate()`.
6. THE Upcheck_Android_App's `MainActivity` SHALL extend a class that inherits from `androidx.fragment.app.FragmentActivity`.

### Requirement 4: Native Bridge Initialization

**User Story:** As an Upcheck React Native developer, I want the Truecaller SDK to be initialized once when the app starts with the correct scope settings, so that subsequent calls from JavaScript reach a configured SDK.

#### Acceptance Criteria

1. THE TruecallerAuthModule SHALL extend `com.facebook.react.bridge.ReactContextBaseJavaModule` and SHALL return `"TruecallerAuthModule"` from `getName()`.
2. WHEN the React Native bridge instantiates TruecallerAuthModule, THE TruecallerAuthModule SHALL invoke `TruecallerSDK.init(scope)` exactly once with a `TruecallerSdkScope` configured with `consentMode = CONSENT_MODE_BOTTOMSHEET`, `sdkOptions = SDK_OPTION_WITH_OTP`, a non-empty `privacyPolicyUrl`, and a non-empty `termsOfServiceUrl`.
3. THE TruecallerAuthPackage SHALL implement `com.facebook.react.ReactPackage` and SHALL return a list containing one TruecallerAuthModule from `createNativeModules`.
4. THE Upcheck_Android_App's `MainApplication` SHALL include `new TruecallerAuthPackage()` in the list returned by `getPackages()`.
5. THE TruecallerAuthModule SHALL register an `ActivityEventListener` that forwards `onActivityResult` calls with `requestCode == TruecallerSDK.SHARE_PROFILE_REQUEST_CODE` to `TruecallerSDK.getInstance().onActivityResultObtained(...)`.
6. THE Upcheck_Android_App's release ProGuard configuration SHALL include keep rules that preserve all classes and interfaces in the package `com.truecaller.android.sdk`.

### Requirement 5: React Native JS Wrapper API

**User Story:** As an Upcheck application developer, I want a typed JavaScript module that exposes the Truecaller bridge methods and event stream, so that I can implement the login flow in React without touching native code.

#### Acceptance Criteria

1. THE TruecallerAuth_JS module SHALL export a `TruecallerAuth` object with the methods `isUsable()`, `authenticate()`, `startManualVerification(phoneNumber, firstName, lastName)`, `verifyOtp(otp, firstName, lastName)`, and `clear()`, each returning a `Promise`.
2. THE TruecallerAuth_JS module SHALL export a `TruecallerEvents` object with a method `onEvent(callback)` that subscribes the callback to the `TruecallerVerificationEvent` channel via `NativeEventEmitter` and returns an `EmitterSubscription` whose `remove()` method unsubscribes the callback.
3. WHEN `TruecallerAuth.authenticate()` is invoked and the device has Truecaller installed with a logged-in user, THE TruecallerAuthModule SHALL resolve the returned promise with an object containing `flow = "ONE_TAP"`, `successful = true`, `firstName`, `lastName`, `phoneNumber`, `payload`, `signature`, `signatureAlgorithm`, and `requestNonce`.
4. WHEN `TruecallerAuth.authenticate()` is invoked and the SDK reports `onVerificationRequired`, THE TruecallerAuthModule SHALL resolve the returned promise with an object containing `flow = "VERIFICATION_REQUIRED"`, `successful = false`, and `error = "ERROR_VERIFICATION_REQUIRED"`.
5. WHEN `TruecallerAuth.authenticate()` is invoked and the SDK reports `onFailureProfileShared` with a `TrueError`, THE TruecallerAuthModule SHALL resolve the returned promise with an object containing `flow = "ONE_TAP"`, `successful = false`, the mapped error code in `error`, and the original numeric code in `errorCode`.
6. WHEN `TruecallerAuth.startManualVerification(phoneNumber, firstName, lastName)` is invoked, THE TruecallerAuthModule SHALL call `TruecallerSDK.getInstance().requestVerification("IN", phoneNumber, callback, activity)` with the current foreground `FragmentActivity`.
7. IF `TruecallerAuth.authenticate()` or `TruecallerAuth.startManualVerification(...)` is invoked while the foreground activity is `null`, THEN THE TruecallerAuthModule SHALL resolve the returned promise with an object containing `successful = false` and `error = "ERROR_NO_ACTIVITY"`.

### Requirement 6: One-Tap Authentication Flow

**User Story:** As a Truecaller user with the Truecaller app installed, I want to log in to Upcheck by tapping a single button and confirming the bottom sheet, so that I do not have to type my phone number or wait for an OTP.

#### Acceptance Criteria

1. WHEN the user taps the "Continue with Truecaller" button on TruecallerLoginScreen, THE TruecallerLoginScreen SHALL invoke `TruecallerAuth.authenticate()` after all required runtime permissions have been granted.
2. WHEN `TruecallerAuth.authenticate()` resolves with `flow = "ONE_TAP"` and `successful = true`, THE TruecallerLoginScreen SHALL POST the fields `payload`, `signature`, `signatureAlgorithm`, `requestNonce`, `phoneNumber`, `firstName`, and `lastName` to TruecallerAuthEndpoint.
3. WHEN TruecallerAuthEndpoint returns a successful Supabase_Session in response to a One-Tap submission, THE TruecallerLoginScreen SHALL store the session via the existing `SupabaseAuthContext` and SHALL navigate the user to the app's authenticated home route.
4. WHEN `TruecallerAuth.authenticate()` resolves with `flow = "ONE_TAP"` and `successful = false` and `error` is `"ERROR_VERIFICATION_REQUIRED"`, `"ERROR_TYPE_TC_NOT_INSTALLED"`, or `"ERROR_TYPE_USER_DENIED"`, THE TruecallerLoginScreen SHALL display PhoneEntrySection.

### Requirement 7: Phone Number Entry for Manual Verification

**User Story:** As a user without the Truecaller app, I want to enter my Indian phone number and name and start verification, so that I can sign in even though I am not a Truecaller user.

#### Acceptance Criteria

1. THE PhoneEntrySection SHALL collect a first name (1 to 50 characters), an optional last name (0 to 50 characters), and a 10-digit phone number.
2. IF the entered phone number does not match the regular expression `^[6-9]\d{9}$`, THEN THE PhoneEntrySection SHALL display the message "Enter a valid 10-digit Indian mobile number" and SHALL NOT invoke `TruecallerAuth.startManualVerification(...)`.
3. IF the entered first name is empty or contains only whitespace, THEN THE PhoneEntrySection SHALL display the message "Please enter your first name" and SHALL NOT invoke `TruecallerAuth.startManualVerification(...)`.
4. WHEN the user taps the submit button on PhoneEntrySection with valid inputs, THE PhoneEntrySection SHALL invoke `TruecallerAuth.startManualVerification(phoneNumber, firstName, lastName)`.

### Requirement 8: OTP and Missed-Call Verification UI

**User Story:** As a non-Truecaller user, I want to see what stage of verification my phone is at and to enter my OTP when the SMS arrives, so that I can complete sign-in without confusion.

#### Acceptance Criteria

1. WHEN TruecallerEvents emits an event with `event = "OTP_INITIATED"`, THE TruecallerLoginScreen SHALL display OtpEntrySection with a TTL countdown initialized from the `ttl` field of the event.
2. WHEN TruecallerEvents emits an event with `event = "MISSED_CALL_INITIATED"`, THE TruecallerLoginScreen SHALL display a "Waiting for missed call" view with a TTL countdown initialized from the `ttl` field of the event.
3. WHILE the TTL countdown displayed by OtpEntrySection or the missed-call view is greater than zero, THE TruecallerLoginScreen SHALL keep the "Resend OTP" control disabled.
4. WHEN TruecallerEvents emits an event with `event = "OTP_RECEIVED"` and a non-empty `otp` field, THE OtpEntrySection SHALL pre-fill its OTP input with the value of that field.
5. WHEN TruecallerEvents emits an event with `event = "VERIFICATION_COMPLETE"`, THE TruecallerLoginScreen SHALL POST the fields `accessToken` (from the event), `phoneNumber`, `firstName`, and `lastName` to TruecallerAuthEndpoint.
6. WHEN TruecallerEvents emits an event with `event = "PROFILE_VERIFIED_BEFORE"`, THE TruecallerLoginScreen SHALL POST the fields `payload`, `signature`, `requestNonce`, `phoneNumber`, `firstName`, and `lastName` from the event to TruecallerAuthEndpoint.
7. WHEN the user taps "Verify" on OtpEntrySection with a non-empty OTP of at least 4 digits, THE OtpEntrySection SHALL invoke `TruecallerAuth.verifyOtp(otp, firstName, lastName)`.
8. IF the user taps "Verify" on OtpEntrySection with an OTP shorter than 4 digits, THEN THE OtpEntrySection SHALL display the message "Invalid OTP" and SHALL NOT invoke `TruecallerAuth.verifyOtp(...)`.

### Requirement 9: Backend Signature Verification and Replay Protection

**User Story:** As an Upcheck security engineer, I want the backend to verify every Truecaller-signed payload before issuing a session, so that an attacker forging a client response cannot impersonate any user.

#### Acceptance Criteria

1. WHEN TruecallerAuthEndpoint receives a request body containing `payload`, `signature`, and `signatureAlgorithm`, THE TruecallerService SHALL verify `signature` against `payload` using one of the public keys retrieved from `https://api4.truecaller.com/v1/key`, applying the algorithm declared in `signatureAlgorithm` (`RSA-SHA512` for `SHA512withRSA`, `RSA-SHA256` for `SHA256withRSA`).
2. THE TruecallerService SHALL cache the response from `https://api4.truecaller.com/v1/key` for at least 1 hour and at most 24 hours.
3. IF signature verification against every public key returned by `https://api4.truecaller.com/v1/key` fails, THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Invalid signature" }`.
4. WHEN TruecallerService verifies a signature successfully, THE TruecallerService SHALL decode `payload` from base64 to JSON and SHALL extract `requestNonce` and `requestTime` from the decoded object.
5. IF the `requestNonce` value embedded in the decoded payload does not equal the `requestNonce` field in the request body, THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Nonce mismatch" }`.
6. IF the `requestTime` value embedded in the decoded payload is more than 600,000 milliseconds older than the server's current Unix time, THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Payload expired" }`.
7. THE TruecallerService SHALL persist every `requestNonce` from a successfully verified payload in a store with a time-to-live of at least 600 seconds, and IF a verification request arrives whose `requestNonce` is already present in that store, THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Nonce already used" }`.

### Requirement 10: Backend Access Token Verification (OTP Flow)

**User Story:** As an Upcheck security engineer, I want the backend to verify the Truecaller access token returned by the OTP flow against Truecaller's servers before issuing a session, so that a forged access token cannot create a user record.

#### Acceptance Criteria

1. WHEN TruecallerAuthEndpoint receives a request body that contains `accessToken` but no `payload`, THE TruecallerService SHALL issue an HTTP GET request to `https://api5.truecaller.com/v1/otp/installation/verify/profile` with the header `Authorization: Bearer <accessToken>`.
2. IF the response from the Truecaller profile API has an HTTP status outside the range 200 to 299, THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Invalid access token" }`.
3. IF the response body returned by the Truecaller profile API does not contain a non-empty `phoneNumber` field, THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Invalid Truecaller profile" }`.
4. IF the `phoneNumber` returned by the Truecaller profile API does not equal the `phoneNumber` field in the request body (after stripping a leading `+91` and any non-digit characters from both values), THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Phone number mismatch" }`.

### Requirement 11: Session Issuance and Account Linking

**User Story:** As an Upcheck user signing in via Truecaller, I want to receive the same Supabase session that email/password and Google OAuth users receive, so that the rest of the app treats me identically and I can switch sign-in methods without losing my data.

#### Acceptance Criteria

1. WHEN TruecallerService completes verification (signed payload or access token), THE TruecallerAuthEndpoint SHALL invoke `SupabaseAuthService.signInWithTruecaller({ phoneNumber, firstName, lastName, email, avatarUrl })` with values sourced from the verified Truecaller profile, not from the request body.
2. WHEN `SupabaseAuthService.signInWithTruecaller(...)` is called with a `phoneNumber` that already exists on a row of the `users` table, THE SupabaseAuthService SHALL update that row's `phone_verified` to `true` and `auth_provider` to `truecaller` and SHALL return a Supabase_Session for the existing Supabase user.
3. WHEN `SupabaseAuthService.signInWithTruecaller(...)` is called with a `phoneNumber` not present on any row of the `users` table and the verified Truecaller profile contains an `email` that exists on a row of the `users` table, THE SupabaseAuthService SHALL link the phone number to that row by updating `phone`, `phone_verified = true`, and `auth_provider = truecaller` and SHALL return a Supabase_Session for that user.
4. WHEN `SupabaseAuthService.signInWithTruecaller(...)` is called with a `phoneNumber` and an `email` that both have no matching row in the `users` table, THE SupabaseAuthService SHALL create a new Supabase auth user, insert a corresponding `users` row with `phone_verified = true` and `auth_provider = truecaller`, and SHALL return a Supabase_Session for that user.
5. WHEN TruecallerAuthEndpoint completes successfully, THE TruecallerAuthEndpoint SHALL respond with HTTP status 200 and a body containing the Supabase_Session in the same shape produced by `POST /auth/supabase/signin`.

### Requirement 12: Truecaller SDK Error Mapping and Recovery

**User Story:** As an Upcheck user, I want clear behavior when the Truecaller SDK reports an error, so that I either see an actionable message or am moved to a working alternative sign-in path.

#### Acceptance Criteria

1. THE TruecallerAuthModule SHALL map every numeric `TrueError` code returned by the SDK to one of the string codes `ERROR_TYPE_INTERNAL`, `ERROR_TYPE_NETWORK`, `ERROR_TYPE_USER_DENIED`, `ERROR_PROFILE_NOT_FOUND`, `ERROR_TYPE_UNAUTHORIZED_USER`, `ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY`, `ERROR_TYPE_TRUESDK_TOO_OLD`, `ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION`, `ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH`, `ERROR_TYPE_REQUEST_NONCE_MISMATCH`, `ERROR_TYPE_INVALID_ACCOUNT_STATE`, `ERROR_TYPE_TC_NOT_INSTALLED`, or `ERROR_TYPE_ACTIVITY_NOT_FOUND`, falling back to `ERROR_UNKNOWN_<code>` for any code outside that set.
2. WHEN `TruecallerAuth.authenticate()` resolves with `error = "ERROR_TYPE_NETWORK"`, THE TruecallerLoginScreen SHALL display the message "No internet connection. Please check your network and try again" and SHALL keep the user on the initial One-Tap screen.
3. WHEN `TruecallerAuth.authenticate()` resolves with `error = "ERROR_PROFILE_NOT_FOUND"`, `error = "ERROR_TYPE_UNAUTHORIZED_USER"`, `error = "ERROR_TYPE_TRUESDK_TOO_OLD"`, or `error = "ERROR_TYPE_INVALID_ACCOUNT_STATE"`, THE TruecallerLoginScreen SHALL display PhoneEntrySection so the user can complete the OTP fallback flow.
4. WHEN TruecallerEvents emits an event with `event = "VERIFICATION_FAILED"`, THE TruecallerLoginScreen SHALL display a message containing the event's `exceptionMessage` field and SHALL return the screen to the PhoneEntrySection state.
5. THE TruecallerLoginScreen SHALL render a "Sign in with email" link that navigates the user to the existing email/password login screen, and that link SHALL be visible from the One-Tap state, the PhoneEntrySection state, and the OtpEntrySection state.

### Requirement 13: Logging and Privacy of Sensitive Fields

**User Story:** As an Upcheck privacy and security reviewer, I want sensitive Truecaller authentication fields to never appear in production logs, so that a leaked log file cannot be used to recover user phone numbers, payloads, or tokens.

#### Acceptance Criteria

1. IF a release build of the Upcheck_Android_App emits a log statement, THEN THE TruecallerAuthModule SHALL NOT include the values of `payload`, `signature`, `requestNonce`, `accessToken`, or any complete `phoneNumber` in that log statement.
2. IF a production build of the backend emits a log statement, THEN THE TruecallerService SHALL NOT include the values of `payload`, `signature`, `requestNonce`, `accessToken`, or any complete `phoneNumber` in that log statement.
3. WHERE the backend logs a phone number for diagnostic purposes, THE TruecallerService SHALL mask the phone number such that only the last 4 digits remain visible (for example, `+91XXXXXX1234`).
4. THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Invalid request" }` whenever validation of the request body fails, without including the offending field's value in the response.

### Requirement 14: Session Cleanup on Logout

**User Story:** As an Upcheck user signing out from a shared device, I want the app to forget my Truecaller session, so that the next sign-in attempt prompts for the bottom-sheet consent again.

#### Acceptance Criteria

1. WHEN the user invokes the app's sign-out action, THE Upcheck_Android_App SHALL invoke `TruecallerAuth.clear()`.
2. WHEN `TruecallerAuth.clear()` is invoked, THE TruecallerAuthModule SHALL call `TruecallerSDK.clear()`.
