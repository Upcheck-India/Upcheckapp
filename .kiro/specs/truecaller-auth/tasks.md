# Implementation Plan: Truecaller Auth

## Overview

Integrate Truecaller SDK 2.6.0 into the Upcheck Android app with a NestJS backend verifier. Tasks are ordered bottom-up: Android setup → native bridge → JS wrapper → UI → backend → tests → manual QA.

## Dependency Graph

```mermaid
flowchart LR
    T1[1. Gradle/Manifest] --> T2[2. Native Bridge]
    T2 --> T3[3. JS Wrapper]
    T3 --> T4[4. UI Components]
    T4 --> T5[5. Frontend Integration]
    T6[6. Backend DTO] --> T7[7. TruecallerService]
    T7 --> T8[8. Controller Wiring]
    T8 --> T9[9. Account Linking Rollback]
    T5 --> T10[10. Property Tests]
    T9 --> T10
    T10 --> T11[11. Integration Tests]
    T11 --> T12[12. Env Vars + Docs]
    T12 --> T13[13. Manual QA Gates]
```

## Tasks

- [x] 1. Android Gradle, Manifest, and Partner Key setup
  - Add `com.truecaller.android.sdk:truecaller-sdk:2.6.0` to `frontend/android/app/build.gradle`
  - Create `frontend/android/app/src/main/res/values/strings.xml` with `partnerKey` resource and add to `.gitignore`
  - Add `INTERNET`, `READ_PHONE_STATE`, `READ_CALL_LOG`, `CALL_PHONE`, `ANSWER_PHONE_CALLS`, `RECEIVE_SMS` permissions to `AndroidManifest.xml`
  - Add `<meta-data android:name="com.truecaller.android.sdk.PartnerKey" android:value="@string/partnerKey"/>` inside `<application>`
  - Add Truecaller SDK keep rules to `frontend/android/app/proguard-rules.pro`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.6_

- [x] 2. Android native bridge (TruecallerAuthModule, Package, MainApplication)
  - [x] 2.1 Create `TruecallerAuthModule.java` in `frontend/android/app/src/main/java/com/upcheck/app/`
    - Implement `ITrueCallback` (One-Tap), `VerificationCallback` (OTP/missed call), and `ActivityEventListener`
    - Initialize `TruecallerSDK.init(scope)` in constructor with `SDK_OPTION_WITH_OTP` and policy URLs
    - Expose `@ReactMethod`s: `isUsable`, `authenticate`, `startManualVerification`, `verifyOtp`, `clear`
    - Implement `mapErrorCode(int)` for the 13 canonical strings + `ERROR_UNKNOWN_<n>` fallback
    - Strip sensitive fields from release-build logs
    - _Requirements: 4.1, 4.2, 4.5, 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 12.1, 13.1_
  - [x] 2.2 Create `TruecallerAuthPackage.java` implementing `ReactPackage.createNativeModules`
    - _Requirements: 4.3_
  - [x] 2.3 Wire `TruecallerAuthPackage` into `MainApplication.kt` `getPackages()`
    - Verify `MainActivity` extends a `FragmentActivity`-derived class
    - _Requirements: 3.6, 4.4_

- [x] 3. JS wrapper module and permissions helper
  - [x] 3.1 Create `frontend/src/native/TruecallerAuth.js` (or `.ts`) wrapping `NativeModules.TruecallerAuthModule`
    - Export `TruecallerAuth` with `isUsable`, `authenticate`, `startManualVerification`, `verifyOtp`, `clear`
    - Export `TruecallerEvents.onEvent(callback)` using `NativeEventEmitter` for `TruecallerVerificationEvent`
    - _Requirements: 5.1, 5.2_
  - [x] 3.2 Create `frontend/src/native/truecallerPermissions.ts` with `requestTruecallerPermissions()`
    - Use `PermissionsAndroid` to request `READ_PHONE_STATE`, `READ_CALL_LOG`, and `ANSWER_PHONE_CALLS` (API 26+) or `CALL_PHONE` (API ≤25)
    - Return a result describing which permissions were denied
    - _Requirements: 3.4, 3.5_

- [x] 4. JS UI components (PhoneEntrySection, OtpEntrySection, TruecallerLoginScreen)
  - [x] 4.1 Create `frontend/src/screens/auth/components/PhoneEntrySection.tsx`
    - Inputs for first name (1-50), optional last name (0-50), 10-digit phone matching `^[6-9]\d{9}$`
    - Validation messages and submit calls `TruecallerAuth.startManualVerification(phone, firstName, lastName)`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 4.2 Create `frontend/src/screens/auth/components/OtpEntrySection.tsx`
    - OTP input (≥4 digits), TTL countdown, disabled "Resend OTP" while ttl > 0
    - Auto-fill on `OTP_RECEIVED` events; submit calls `TruecallerAuth.verifyOtp(otp, firstName, lastName)`
    - _Requirements: 8.3, 8.4, 8.7, 8.8_
  - [x] 4.3 Create `frontend/src/screens/auth/TruecallerLoginScreen.tsx`
    - Phase state machine: `idle`, `manual`, `awaiting_otp`, `awaiting_missed_call`, `verifying`
    - Subscribe to `TruecallerEvents`; route `OTP_INITIATED`, `MISSED_CALL_INITIATED`, `VERIFICATION_COMPLETE`, `PROFILE_VERIFIED_BEFORE`, `VERIFICATION_FAILED`
    - On One-Tap success POST `{ payload, signature, signatureAlgorithm, requestNonce, phoneNumber, firstName, lastName }`
    - On `VERIFICATION_COMPLETE` POST `{ accessToken, phoneNumber, firstName, lastName }`
    - Map error codes to UI behavior per Requirement 12, render persistent "Sign in with email" link
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.5, 8.6, 12.2, 12.3, 12.4, 12.5_

- [x] 5. Frontend integration (navigation, session storage, logout)
  - [x] 5.1 Register `TruecallerLoginScreen` in the auth navigation stack
    - Add a "Continue with Truecaller" button to the existing login entry point
    - _Requirements: 6.1, 12.5_
  - [x] 5.2 On 200 response, call `SupabaseAuthContext.setSession(session)` and navigate to authenticated home
    - _Requirements: 6.3, 11.5_
  - [x] 5.3 Invoke `TruecallerAuth.clear()` from the existing sign-out handler
    - _Requirements: 14.1, 14.2_

- [x] 6. Backend DTO update for `truecaller-auth.dto.ts`
  - Make `accessToken` optional and add `payload`, `signature`, `signatureAlgorithm`, `requestNonce` (all optional strings)
  - Add a class-level invariant: exactly one of `accessToken` or `payload` must be present
  - Keep `phoneNumber`, `firstName`, `lastName`, `email`, `avatarUrl` fields
  - _Requirements: 6.2, 8.5, 8.6, 13.4_

- [x] 7. Backend `TruecallerService` full implementation
  - [x] 7.1 Replace stub with real implementation in `backend/src/auth/truecaller.service.ts`
    - Implement `verifySignedPayload({ payload, signature, signatureAlgorithm, requestNonce })`
    - Implement `verifyAccessToken(accessToken, phoneNumber)` against `https://api5.truecaller.com/v1/otp/installation/verify/profile`
    - Implement `normalizePhone(input)` stripping `+91`/`91` prefix and non-digits
    - Implement `maskPhone(phone)` that retains only the last 4 digits
    - _Requirements: 9.1, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 13.2, 13.3_
  - [x] 7.2 Implement public-key cache from `https://api4.truecaller.com/v1/key`
    - In-memory cache with TTL between 1h and 24h; refresh on miss
    - Try every cached key until signature verifies
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 7.3 Implement nonce replay store with TTL ≥ 600s
    - In-memory `Map<string, expiresAt>` interface with periodic eviction; pluggable for Redis later
    - Reject second use of same `requestNonce` with `UnauthorizedException("Nonce already used")`
    - _Requirements: 9.7_

- [x] 8. Backend controller wiring in `supabase-auth.controller.ts`
  - Update `truecallerOAuth` to dispatch on body shape (`payload` present → `verifySignedPayload`, else `verifyAccessToken`)
  - Map verification failures to 401 with the exact message strings from Requirements 9.3, 9.5, 9.6, 9.7, 10.2, 10.3, 10.4
  - On success call `signInWithTruecaller` using fields from the verified profile, never the request body
  - Return 200 with `{ user, session }` matching `POST /auth/supabase/signin`
  - _Requirements: 11.1, 11.5, 13.4_

- [x] 9. Backend account-linking rollback in `signInWithTruecaller`
  - Wrap Branch 3 (create new auth user + insert `users` row) so a `users.insert` failure deletes the orphan auth user via `supabase.auth.admin.deleteUser`
  - Confirm Branches 1, 2, 3, 4 each return the expected `user.id` per design Section "Account linking branches"
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 10. Property-based tests (11 properties from design.md)
  - [x] 10.1 Bridge result shape totality (JS test against mocked native module)
    - _Property: 1_  _Validates: Requirements 5.3, 5.5, 12.1_
  - [x] 10.2 PhoneEntrySection input validation iff schema
    - _Property: 2_  _Validates: Requirements 7.1, 7.2, 7.3, 7.4_
  - [x] 10.3 OtpEntrySection countdown gates Verify and Resend
    - _Property: 3_  _Validates: Requirements 8.3, 8.7, 8.8_
  - [x] 10.4 `_INITIATED` events transition to corresponding waiting phase
    - _Property: 4_  _Validates: Requirements 8.1, 8.2_
  - [x] 10.5 Backend dispatch carries correct fields per active flow
    - _Property: 5_  _Validates: Requirements 6.2, 8.5, 8.6_
  - [x] 10.6 Signature verification accepts well-formed and rejects mutations
    - Generate keypair, sign payloads with fast-check, mutate signature/payload/nonce/time
    - _Property: 6_  _Validates: Requirements 9.1, 9.3, 9.4, 9.5, 9.6_
  - [x] 10.7 Nonce replay rejection within TTL
    - _Property: 7_  _Validates: Requirements 9.7_
  - [x] 10.8 Account linking is idempotent and branch-correct
    - Use mocked Supabase client; assert same `user.id` across two calls
    - _Property: 8_  _Validates: Requirements 11.1, 11.2, 11.3, 11.4_
  - [x] 10.9 TrueError code mapping is total
    - _Property: 9_  _Validates: Requirements 12.1_
  - [x] 10.10 Phone normalization is canonical for `+91`
    - _Property: 10_  _Validates: Requirements 10.4_
  - [x] 10.11 "Sign in with email" link reachable from every phase
    - _Property: 11_  _Validates: Requirements 12.5_

- [x] 11. Example-based and integration tests
  - [x] 11.1 `TruecallerService` integration tests with `nock` for `api4`/`api5` endpoints
    - Cover happy-path, signature mismatch, nonce mismatch, expired payload, replay, phone mismatch, network failures
    - _Requirements: 9.1, 9.3, 9.5, 9.6, 9.7, 10.2, 10.3, 10.4_
  - [x] 11.2 Controller integration test for `POST /auth/supabase/oauth/truecaller`
    - Assert response shape matches `POST /auth/supabase/signin`
    - _Requirements: 11.5, 13.4_
  - [x] 11.3 React Native screen integration test for `TruecallerLoginScreen` phase transitions
    - Drive `TruecallerEvents` through `OTP_INITIATED → OTP_RECEIVED → VERIFICATION_COMPLETE`
    - _Requirements: 6.4, 8.1, 8.2, 8.4, 12.4_

- [x] 12. Checkpoint
  - Ensure all tests pass, ask the user if questions arise

- [x] 13. Backend env vars and setup documentation
  - Add `TRUECALLER_PUBLIC_KEY_TTL_SECONDS`, `TRUECALLER_NONCE_TTL_SECONDS`, `TRUECALLER_PROFILE_API_URL`, `TRUECALLER_KEYS_API_URL` to `backend/.env.example`
  - Update `backend/README.md` with Truecaller verification config section
  - Update `README-AUTH.md` with developer console steps (package name, SHA-1 fingerprints, test numbers, SMS Retriever hash)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.2_

- [x] 14. Manual QA Gates A-E (release readiness checklist)
  - [x] 14.1 Gate A — One-Tap on real Truecaller user (debug build)
    - _Requirements: 6.1, 6.3_
  - [x] 14.2 Gate B — OTP fallback on non-Truecaller device (debug build)
    - _Requirements: 6.4, 8.1, 8.5_
  - [x] 14.3 Gate C — Server-side rejection of forged payload (mutate one byte, expect 401)
    - _Requirements: 9.3_
  - [x] 14.4 Gate D — Server-side rejection of replay (same nonce twice, expect 200 then 401)
    - _Requirements: 9.7_
  - [x] 14.5 Gate E — Release APK (ProGuard + Play App Signing) re-runs Gates A and B
    - _Requirements: 4.6_

- [x] 15. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked `*` are optional test sub-tasks and can be skipped for a faster MVP
- Property test numbering matches design.md "Correctness Properties" section (Properties 1-11)
- Manual QA gates correspond to `TruecallerAuth.md` Part 10 verification gates 5.3A, 5.3B, 7.Test 2, 7.Test 3, and the release-build checklist
- Sensitive fields (`payload`, `signature`, `requestNonce`, `accessToken`, full `phoneNumber`) must never appear in release/production logs (Requirements 13.1, 13.2)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "6"] },
    { "id": 1, "tasks": ["2.1", "2.2", "7.1"] },
    { "id": 2, "tasks": ["2.3", "7.2", "7.3"] },
    { "id": 3, "tasks": ["3.1", "3.2", "8"] },
    { "id": 4, "tasks": ["4.1", "4.2", "9"] },
    { "id": 5, "tasks": ["4.3"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.8", "10.9", "10.10", "10.11"] },
    { "id": 8, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 9, "tasks": ["13"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5"] }
  ]
}
```
