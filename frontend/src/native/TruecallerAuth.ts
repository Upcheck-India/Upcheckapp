/**
 * TruecallerAuth — typed JS wrapper around the native `TruecallerAuthModule`
 * (see `frontend/android/app/src/main/java/com/upcheck/app/TruecallerAuthModule.java`).
 *
 * Exposes:
 *   - `TruecallerAuth` with `isUsable`, `authenticate`, `startManualVerification`,
 *     `verifyOtp`, and `clear`.
 *   - `TruecallerEvents.onEvent(callback)` that subscribes to the
 *     `TruecallerVerificationEvent` channel via `NativeEventEmitter` and
 *     returns an `EmitterSubscription` whose `.remove()` unsubscribes.
 *
 * This module is Android-only. On non-Android platforms the methods reject
 * with an `ERROR_PLATFORM_UNSUPPORTED` error so callers get a deterministic
 * shape rather than a confusing "undefined is not an object" crash.
 *
 * Validates: Requirements 5.1, 5.2.
 */

import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';

// ──────────────────────────────────────────────────────────────────────────────
// Native module shape (Promise-based subset of the Java bridge)
// ──────────────────────────────────────────────────────────────────────────────

interface TruecallerAuthNativeModule {
  isUsable(): Promise<boolean>;
  authenticate(): Promise<TruecallerAuthResult>;
  startManualVerification(
    phoneNumber: string,
    firstName: string,
    lastName: string,
  ): Promise<TruecallerAuthResult>;
  verifyOtp(
    otp: string,
    firstName: string,
    lastName: string,
  ): Promise<TruecallerAuthResult>;
  clear(): void;
}

const { TruecallerAuthModule } = NativeModules as {
  TruecallerAuthModule?: TruecallerAuthNativeModule;
};

// ──────────────────────────────────────────────────────────────────────────────
// Result types (match the WritableMap shape produced by TruecallerAuthModule.java)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Canonical TrueError code strings emitted by the native bridge's
 * `mapErrorCode(int)` helper, plus the bridge-level pseudo-errors used when
 * the SDK cannot be invoked at all. Unknown numeric codes are reported as
 * `ERROR_UNKNOWN_<n>` (Requirement 12.1).
 */
/**
 * The 13 canonical TrueError string codes the native bridge can map a numeric
 * `TrueError` constant to (Requirement 12.1). Kept as a const tuple so the TS
 * type, the runtime list, and the canonical-set check below stay in sync.
 */
export const CANONICAL_TRUECALLER_ERROR_CODES = [
  'ERROR_TYPE_INTERNAL',
  'ERROR_TYPE_NETWORK',
  'ERROR_TYPE_USER_DENIED',
  'ERROR_PROFILE_NOT_FOUND',
  'ERROR_TYPE_UNAUTHORIZED_USER',
  'ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY',
  'ERROR_TYPE_TRUESDK_TOO_OLD',
  'ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION',
  'ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH',
  'ERROR_TYPE_REQUEST_NONCE_MISMATCH',
  'ERROR_TYPE_INVALID_ACCOUNT_STATE',
  'ERROR_TYPE_TC_NOT_INSTALLED',
  'ERROR_TYPE_ACTIVITY_NOT_FOUND',
] as const;

export type CanonicalTruecallerErrorCode =
  (typeof CANONICAL_TRUECALLER_ERROR_CODES)[number];

export type TruecallerErrorCode =
  | CanonicalTruecallerErrorCode
  | 'ERROR_VERIFICATION_REQUIRED'
  | 'ERROR_NO_ACTIVITY'
  | 'ERROR_SDK_NOT_INITIALIZED'
  | 'ERROR_PLATFORM_UNSUPPORTED'
  | `ERROR_UNKNOWN_${number}`;

/**
 * Numeric `TrueError` constants (from Truecaller SDK 2.x `TrueError.java`)
 * mapped to their canonical string code. Mirrors the `mapErrorCode(int)`
 * switch in `TruecallerAuthModule.java` so both sides stay aligned and the
 * mapping can be exercised by property tests on the JS side.
 *
 * Note: 12 and 14 are intentionally absent — they're unused / reserved in
 * the SDK and therefore fall through to the `ERROR_UNKNOWN_<n>` branch,
 * which the property test relies on.
 */
export const TRUE_ERROR_CODE_TO_CANONICAL: Readonly<
  Record<number, CanonicalTruecallerErrorCode>
> = Object.freeze({
  1: 'ERROR_TYPE_INTERNAL',
  2: 'ERROR_TYPE_NETWORK',
  3: 'ERROR_TYPE_USER_DENIED',
  4: 'ERROR_PROFILE_NOT_FOUND',
  5: 'ERROR_TYPE_UNAUTHORIZED_USER',
  6: 'ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY',
  7: 'ERROR_TYPE_TRUESDK_TOO_OLD',
  8: 'ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION',
  9: 'ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH',
  10: 'ERROR_TYPE_REQUEST_NONCE_MISMATCH',
  11: 'ERROR_TYPE_INVALID_ACCOUNT_STATE',
  13: 'ERROR_TYPE_TC_NOT_INSTALLED',
  15: 'ERROR_TYPE_ACTIVITY_NOT_FOUND',
});

/**
 * Pure TS port of `TruecallerAuthModule.mapErrorCode(int)` (Property 9 /
 * Requirement 12.1). For any integer `code`, returns the matching canonical
 * string when `code` is one of the documented `TrueError` constants, or
 * `ERROR_UNKNOWN_<code>` otherwise. Total: never throws, never returns null.
 *
 * Non-integer inputs (NaN, Infinity, fractional numbers) are normalized via
 * `Math.trunc` to keep the function total over arbitrary `number` values.
 */
export function mapTrueErrorCode(code: number): TruecallerErrorCode {
  // Normalise non-integer inputs — Java's `int` is always an integer, but the
  // TS signature accepts `number`, so we collapse fractional / non-finite
  // values to a deterministic integer before lookup.
  const normalized = Number.isFinite(code) ? Math.trunc(code) : code;
  const canonical = TRUE_ERROR_CODE_TO_CANONICAL[normalized as number];
  if (canonical !== undefined) return canonical;
  return `ERROR_UNKNOWN_${normalized}` as TruecallerErrorCode;
}

/** One-Tap success — Truecaller user, app installed, consent granted. */
export interface OneTapSuccessResult {
  flow: 'ONE_TAP';
  successful: true;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  countryCode: string;
  email: string;
  isVerified: boolean;
  /** Base64-encoded JSON; verify server-side via TruecallerService. */
  payload: string;
  signature: string;
  signatureAlgorithm: string;
  requestNonce: string;
}

/** One-Tap failure — `onFailureProfileShared` from the SDK. */
export interface OneTapFailureResult {
  flow: 'ONE_TAP';
  successful: false;
  error: TruecallerErrorCode;
  /** Original numeric `TrueError` code from the SDK. */
  errorCode: number;
}

/** Non-TC user — JS should fall through to manual verification. */
export interface VerificationRequiredResult {
  flow: 'VERIFICATION_REQUIRED';
  successful: false;
  error: 'ERROR_VERIFICATION_REQUIRED';
}

/** OTP / missed-call success — `TYPE_VERIFICATION_COMPLETE` callback. */
export interface OtpVerificationSuccessResult {
  flow: 'OTP_VERIFICATION';
  successful: true;
  /** Server-to-server exchangeable token. Verify via TruecallerService. */
  accessToken?: string;
}

/**
 * OTP / missed-call failure — `onRequestFailure` callback. The native bridge
 * resolves the same payload it emits on the `TruecallerVerificationEvent`
 * channel, so this shape carries `event: "VERIFICATION_FAILED"` rather than
 * `successful: false`.
 */
export interface OtpVerificationFailureResult {
  event: 'VERIFICATION_FAILED';
  exceptionCode: number;
  exceptionMessage: string;
}

/**
 * Bridge-level failures that occur before the SDK is even invoked
 * (no foreground activity, SDK not initialized, non-Android platform).
 */
export interface BridgeFailureResult {
  successful: false;
  error: TruecallerErrorCode;
}

export type TruecallerAuthResult =
  | OneTapSuccessResult
  | OneTapFailureResult
  | VerificationRequiredResult
  | OtpVerificationSuccessResult
  | OtpVerificationFailureResult
  | BridgeFailureResult;

// ──────────────────────────────────────────────────────────────────────────────
// Event types (TruecallerVerificationEvent channel)
// ──────────────────────────────────────────────────────────────────────────────

export interface OtpInitiatedEvent {
  event: 'OTP_INITIATED';
  /** TTL in seconds, as a string per the SDK's WritableMap encoding. */
  ttl: string | null;
}

export interface OtpReceivedEvent {
  event: 'OTP_RECEIVED';
  otp: string | null;
}

export interface MissedCallInitiatedEvent {
  event: 'MISSED_CALL_INITIATED';
  ttl: string | null;
}

export interface MissedCallReceivedEvent {
  event: 'MISSED_CALL_RECEIVED';
}

export interface VerificationCompleteEvent {
  event: 'VERIFICATION_COMPLETE';
  accessToken?: string;
}

export interface ProfileVerifiedBeforeEvent {
  event: 'PROFILE_VERIFIED_BEFORE';
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  payload?: string;
  signature?: string;
  requestNonce?: string;
}

export interface VerificationFailedEvent {
  event: 'VERIFICATION_FAILED';
  exceptionCode: number;
  exceptionMessage: string;
}

export type TruecallerVerificationEvent =
  | OtpInitiatedEvent
  | OtpReceivedEvent
  | MissedCallInitiatedEvent
  | MissedCallReceivedEvent
  | VerificationCompleteEvent
  | ProfileVerifiedBeforeEvent
  | VerificationFailedEvent;

export const TRUECALLER_EVENT_NAME = 'TruecallerVerificationEvent';

// ──────────────────────────────────────────────────────────────────────────────
// Implementation
// ──────────────────────────────────────────────────────────────────────────────

const isAndroid = Platform.OS === 'android';

const unsupportedResult: BridgeFailureResult = {
  successful: false,
  error: 'ERROR_PLATFORM_UNSUPPORTED',
};

/**
 * `NativeEventEmitter` requires a non-null native module on iOS; on Android
 * it works with or without one. Pass the module when it exists so the emitter
 * is wired to `RCTDeviceEventEmitter` correctly, and fall back to a constructor
 * call without arguments when the module is absent (e.g. unit tests, web).
 */
const eventEmitter: NativeEventEmitter = TruecallerAuthModule
  ? new NativeEventEmitter(
      TruecallerAuthModule as unknown as ConstructorParameters<
        typeof NativeEventEmitter
      >[0],
    )
  : new NativeEventEmitter();

function ensureModule(): TruecallerAuthNativeModule | null {
  if (!isAndroid) return null;
  return TruecallerAuthModule ?? null;
}

export const TruecallerAuth = {
  /** Resolves true iff the Truecaller SDK is initialized and a TC user is logged in. */
  isUsable(): Promise<boolean> {
    const mod = ensureModule();
    if (!mod) return Promise.resolve(false);
    return mod.isUsable();
  },

  /** Trigger the One-Tap bottom sheet; resolves to a `TruecallerAuthResult`. */
  authenticate(): Promise<TruecallerAuthResult> {
    const mod = ensureModule();
    if (!mod) return Promise.resolve(unsupportedResult);
    return mod.authenticate();
  },

  /**
   * Start the OTP / missed-call verification flow for a non-Truecaller user.
   * Progress is emitted on the `TruecallerVerificationEvent` channel; the
   * returned promise resolves on `TYPE_VERIFICATION_COMPLETE` (success) or
   * `onRequestFailure` (failure).
   */
  startManualVerification(
    phoneNumber: string,
    firstName: string,
    lastName: string,
  ): Promise<TruecallerAuthResult> {
    const mod = ensureModule();
    if (!mod) return Promise.resolve(unsupportedResult);
    return mod.startManualVerification(phoneNumber, firstName, lastName);
  },

  /** Submit the OTP collected from the SMS / WhatsApp IM channel. */
  verifyOtp(
    otp: string,
    firstName: string,
    lastName: string,
  ): Promise<TruecallerAuthResult> {
    const mod = ensureModule();
    if (!mod) return Promise.resolve(unsupportedResult);
    return mod.verifyOtp(otp, firstName, lastName);
  },

  /** Forget the cached Truecaller session so the next sign-in re-prompts. */
  clear(): void {
    const mod = ensureModule();
    if (!mod) return;
    mod.clear();
  },
};

export type TruecallerEventListener = (event: TruecallerVerificationEvent) => void;

export const TruecallerEvents = {
  /**
   * Subscribe to the `TruecallerVerificationEvent` channel. Returns an
   * `EmitterSubscription` whose `.remove()` unsubscribes the callback.
   */
  onEvent(callback: TruecallerEventListener): EmitterSubscription {
    return eventEmitter.addListener(TRUECALLER_EVENT_NAME, callback);
  },
};

export default TruecallerAuth;
