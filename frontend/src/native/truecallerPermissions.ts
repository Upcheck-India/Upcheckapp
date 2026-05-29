/**
 * Truecaller runtime permissions helper.
 *
 * Requests the Android runtime permissions needed by the Truecaller SDK's
 * OTP / missed-call fallback flow before `TruecallerAuth.authenticate()` is
 * invoked. The set of permissions varies with the Android API level:
 *
 *   - API < 23: the runtime permission model is not in effect; the install-time
 *     permissions declared in AndroidManifest.xml are granted automatically.
 *   - API 23+: request READ_PHONE_STATE and READ_CALL_LOG at runtime.
 *   - API 26+: additionally request ANSWER_PHONE_CALLS.
 *   - API <= 25: additionally request CALL_PHONE instead of ANSWER_PHONE_CALLS.
 *
 * On non-Android platforms (iOS, web) this helper is a no-op that resolves to
 * `granted = true` so callers can use it unconditionally.
 *
 * Validates: Requirements 3.4, 3.5
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

  const perms: Permission[] = [
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  ];

  if (apiLevel >= 26) {
    perms.push(PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS);
  } else {
    perms.push(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
  }

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
