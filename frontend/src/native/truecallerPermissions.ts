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
 * READ_PHONE_STATE is the only permission the app asks for on this path, and as
 * of C0.1 it is the only phone-related permission the app declares at all.
 * READ_CALL_LOG and ANSWER_PHONE_CALLS are gone from AndroidManifest.xml AND
 * from `plugins/withTruecaller.js` (which re-injects at prebuild, so removing
 * one without the other achieves nothing), together with the missed-call flow
 * that needed them: Play's July 2026 policy update dropped account verification
 * by phone call as a permitted use. RECEIVE_SMS and CALL_PHONE were already
 * gone. Do not re-add any of them without a policy-approved use.
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

  // Only READ_PHONE_STATE is requested — it is also the only phone permission
  // the app still declares (C0.1). Nothing left in the app needs call-log or
  // SMS access.
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
