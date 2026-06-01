/**
 * Truecaller runtime permissions helper.
 *
 * Requests the Android runtime permission needed by Truecaller One-Tap before
 * `TruecallerAuth.authenticate()` is invoked.
 *
 *   - API < 23: runtime permissions are not in effect; install-time permissions
 *     in AndroidManifest.xml are granted automatically.
 *   - API 23+: request READ_PHONE_STATE at runtime.
 *
 * The restricted READ_CALL_LOG / RECEIVE_SMS / CALL_PHONE / ANSWER_PHONE_CALLS
 * permissions (legacy missed-call / SMS-retriever fallback) were removed for
 * Play Store compliance, so they are no longer requested.
 *
 * On non-Android platforms (iOS, web) this helper is a no-op that resolves to
 * `granted = true` so callers can use it unconditionally.
 */

import { PermissionsAndroid, Platform, Permission } from 'react-native';

export interface TruecallerPermissionsResult {
  /** True iff every requested permission is in the GRANTED state. */
  granted: boolean;
  /** The Android permission strings that were not granted (denied or never-ask-again). */
  deniedPermissions: string[];
}

/**
 * Request the runtime permissions required by the Truecaller SDK.
 *
 * Resolves with `{ granted: true, deniedPermissions: [] }` on non-Android
 * platforms and on Android API levels below 23 where runtime permissions do
 * not apply.
 */
export async function requestTruecallerPermissions(): Promise<TruecallerPermissionsResult> {
  // Non-Android platforms: nothing to request.
  if (Platform.OS !== 'android') {
    return { granted: true, deniedPermissions: [] };
  }

  // Platform.Version is a number on Android.
  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);

  // Pre-Marshmallow: install-time permissions are auto-granted.
  if (!Number.isFinite(apiLevel) || apiLevel < 23) {
    return { granted: true, deniedPermissions: [] };
  }

  // Only READ_PHONE_STATE is requested. The restricted READ_CALL_LOG / SMS /
  // CALL_PHONE / ANSWER_PHONE_CALLS permissions were removed for Play Store
  // compliance (Google restricts them to default Phone/SMS handler apps), so
  // the legacy missed-call / SMS auto-read fallback is no longer used.
  const perms: Permission[] = [
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  ];

  const result = await PermissionsAndroid.requestMultiple(perms);

  const deniedPermissions: string[] = [];
  for (const perm of perms) {
    if (result[perm] !== PermissionsAndroid.RESULTS.GRANTED) {
      deniedPermissions.push(perm);
    }
  }

  return {
    granted: deniedPermissions.length === 0,
    deniedPermissions,
  };
}
