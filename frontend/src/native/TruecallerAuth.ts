/**
 * TruecallerAuth — typed JS wrapper using @dhana-cs/react-native-truecaller
 *
 * This module wraps the existing Truecaller SDK package rather than
 * implementing a custom native bridge.
 */

import { Platform } from 'react-native';
import TrueCallerSDK, { trueCallerService, TrueCallerOAuthData, OAuthSetup } from '@dhana-cs/react-native-truecaller';

// ──────────────────────────────────────────────────────────────────────────────
// Error codes
// ──────────────────────────────────────────────────────────────────────────────

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

export type CanonicalTruecallerErrorCode = (typeof CANONICAL_TRUECALLER_ERROR_CODES)[number];

export type TruecallerErrorCode =
  | CanonicalTruecallerErrorCode
  | 'ERROR_VERIFICATION_REQUIRED'
  | 'ERROR_NO_ACTIVITY'
  | 'ERROR_SDK_NOT_INITIALIZED'
  | 'ERROR_PLATFORM_UNSUPPORTED'
  | `ERROR_UNKNOWN_${number}`;

// ──────────────────────────────────────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────────────────────────────────────

export interface OneTapSuccessResult {
  flow: 'ONE_TAP';
  successful: true;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  countryCode: string;
  email: string;
  isVerified: boolean;
  payload: string;
  signature: string;
  signatureAlgorithm: string;
  requestNonce: string;
}

export interface OneTapFailureResult {
  flow: 'ONE_TAP';
  successful: false;
  error: TruecallerErrorCode;
  errorCode: number;
}

export interface VerificationRequiredResult {
  flow: 'VERIFICATION_REQUIRED';
  successful: false;
  error: 'ERROR_VERIFICATION_REQUIRED';
}

export interface OtpVerificationSuccessResult {
  flow: 'OTP_VERIFICATION';
  successful: true;
  accessToken?: string;
}

export interface OtpVerificationFailureResult {
  event: 'VERIFICATION_FAILED';
  exceptionCode: number;
  exceptionMessage: string;
}

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
// Event types
// ──────────────────────────────────────────────────────────────────────────────

export interface OtpInitiatedEvent {
  event: 'OTP_INITIATED';
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

export const TruecallerAuth = {
  /** Check if Truecaller SDK is usable (Truecaller app installed and user logged in) */
  async isUsable(): Promise<boolean> {
    if (!isAndroid) return false;
    try {
      return await TrueCallerSDK.isUsable();
    } catch {
      return false;
    }
  },

  /** Initialize the Truecaller SDK with default options */
  async initialize(): Promise<boolean> {
    if (!isAndroid) return false;
    try {
      return await trueCallerService.initialize({
        buttonColor: '#0087D0',
        buttonTextColor: '#FFFFFF',
        loginTextPrefix: 'Sign in to UpCheck',
        sdkOptions: 'TRUECALLER_ANDROID_SDK_OPTION_VERIFY_ALL_USERS',
      });
    } catch {
      return false;
    }
  },

  /** Trigger One-Tap authentication */
  async authenticate(): Promise<TruecallerAuthResult> {
    if (!isAndroid) return unsupportedResult;
    try {
      const result = await trueCallerService.authenticate(['profile', 'phone']);
      if (result.authorizationCode) {
        return {
          flow: 'ONE_TAP',
          successful: true,
          firstName: result.firstName || '',
          lastName: result.lastName || '',
          phoneNumber: result.phoneNumber || '',
          countryCode: '',
          email: result.email || '',
          isVerified: true,
          payload: result.authorizationCode,
          signature: '',
          signatureAlgorithm: '',
          requestNonce: '',
        };
      }
      return {
        flow: 'ONE_TAP',
        successful: false,
        error: 'ERROR_TYPE_INTERNAL',
        errorCode: 1,
      };
    } catch (e: any) {
      return {
        flow: 'ONE_TAP',
        successful: false,
        error: 'ERROR_TYPE_USER_DENIED',
        errorCode: 3,
      };
    }
  },

  /** Setup complete OAuth flow */
  async setupOAuth(scopes?: string[]): Promise<OAuthSetup | null> {
    if (!isAndroid) return null;
    try {
      return await TrueCallerSDK.setupCompleteOAuth(scopes);
    } catch {
      return null;
    }
  },

  /** Clear cached Truecaller session */
  clear(): void {
    // Not directly supported in SDK 3.x - handled internally
  },
};

export const TruecallerEvents = {
  /** Subscribe to verification events - placeholder for SDK 3.x */
  onEvent(callback: (event: TruecallerVerificationEvent) => void): { remove: () => void } {
    // SDK 3.x uses callbacks instead of events
    // Return a mock subscription that can be "removed"
    return {
      remove: () => {},
    };
  },
};

export default TruecallerAuth;