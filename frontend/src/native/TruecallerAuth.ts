/**
 * TruecallerAuth — typed wrapper around @dhana-cs/react-native-truecaller.
 *
 * This is the Truecaller OAuth 2.0 (PKCE) "One-Tap" flow. `authenticate()`
 * drives the native SDK and returns an authorization code + PKCE
 * `codeVerifier` + CSRF `state`. None of these authorize the user on their
 * own — they are forwarded to the backend
 * (`POST /auth/supabase/oauth/truecaller/exchange`), which completes the
 * server-to-server token exchange and mints the session.
 *
 * Android only: Truecaller OAuth requires the Truecaller app to be installed
 * and signed-in on the device. On iOS / web the methods resolve to a
 * platform-unsupported failure so callers can fall back to email login.
 */

import { Platform } from 'react-native';
import { trueCallerService } from '@dhana-cs/react-native-truecaller';

// ──────────────────────────────────────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────────────────────────────────────

export type TruecallerErrorCode =
  | 'ERROR_USER_CANCELLED'
  | 'ERROR_TC_NOT_USABLE'
  | 'ERROR_SDK_NOT_INITIALIZED'
  | 'ERROR_PLATFORM_UNSUPPORTED'
  | 'ERROR_NETWORK'
  | 'ERROR_UNKNOWN';

/** Successful One-Tap result — forward verbatim to the backend exchange. */
export interface TruecallerOAuthSuccess {
  successful: true;
  authorizationCode: string;
  state: string;
  codeVerifier: string;
}

export interface TruecallerOAuthFailure {
  successful: false;
  error: TruecallerErrorCode;
  /** Best-effort native error message, for logging only. */
  message?: string;
}

export type TruecallerAuthResult =
  | TruecallerOAuthSuccess
  | TruecallerOAuthFailure;

// ──────────────────────────────────────────────────────────────────────────────
// Implementation
// ──────────────────────────────────────────────────────────────────────────────

const isAndroid = Platform.OS === 'android';

const unsupportedResult: TruecallerOAuthFailure = {
  successful: false,
  error: 'ERROR_PLATFORM_UNSUPPORTED',
};

/** Map a thrown native error to a coarse, typed error code. */
function classifyError(e: unknown): TruecallerOAuthFailure {
  const message =
    (e as { message?: string })?.message ??
    (typeof e === 'string' ? e : undefined);
  const haystack = (message ?? '').toLowerCase();

  let error: TruecallerErrorCode = 'ERROR_UNKNOWN';
  if (haystack.includes('cancel') || haystack.includes('denied')) {
    error = 'ERROR_USER_CANCELLED';
  } else if (haystack.includes('network')) {
    error = 'ERROR_NETWORK';
  } else if (haystack.includes('usable') || haystack.includes('not installed')) {
    error = 'ERROR_TC_NOT_USABLE';
  } else if (haystack.includes('initiali')) {
    error = 'ERROR_SDK_NOT_INITIALIZED';
  }
  return { successful: false, error, message };
}

export const TruecallerAuth = {
  /**
   * Whether the Truecaller OAuth flow can run on this device (Truecaller app
   * installed and a user is signed in). Always false off-Android.
   */
  async isUsable(): Promise<boolean> {
    if (!isAndroid) return false;
    try {
      return await trueCallerService.isUsable();
    } catch {
      return false;
    }
  },

  /** Initialize the SDK with UpCheck branding. Safe to call repeatedly. */
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

  /**
   * Run the Truecaller One-Tap OAuth flow. Returns the authorization code,
   * PKCE verifier and state on success, or a typed failure otherwise.
   */
  async authenticate(): Promise<TruecallerAuthResult> {
    if (!isAndroid) return unsupportedResult;
    try {
      const result = await trueCallerService.authenticate(['profile', 'phone']);
      if (result?.authorizationCode && result?.codeVerifier) {
        return {
          successful: true,
          authorizationCode: result.authorizationCode,
          state: result.state ?? '',
          codeVerifier: result.codeVerifier,
        };
      }
      // SDK resolved without the fields we need to complete the exchange.
      return { successful: false, error: 'ERROR_UNKNOWN' };
    } catch (e: unknown) {
      return classifyError(e);
    }
  },

  /**
   * Clear any cached Truecaller session. The OAuth SDK keeps no JS-side
   * session state, so this is a no-op — retained because the auth store calls
   * it on sign-out to stay provider-agnostic.
   */
  clear(): void {
    // No JS-side cache to clear in the OAuth flow.
  },
};

export default TruecallerAuth;
