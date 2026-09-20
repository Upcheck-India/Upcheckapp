/**
 * withTruecaller — Expo config plugin for the Truecaller OAuth SDK 3.x.
 *
 * This project commits its `android/` folder, so these native files are the
 * source of truth and EAS builds from them directly. This plugin exists so a
 * clean `expo prebuild` reproduces the CONFIG-level wiring:
 *   • the `com.truecaller.android.sdk.ClientId` manifest meta-data,
 *   • the READ_PHONE_STATE permission one-tap OAuth needs, and
 *   • the app-level Gradle dependency on the Truecaller SDK.
 *
 * NOT handled here (they live in the committed tree and must be preserved if
 * you ever `expo prebuild --clean`):
 *   • android/app/src/main/java/com/upcheck/app/truecaller/*.kt (the native module)
 *   • its registration in MainApplication.getPackages().
 *
 * Options: { clientId: string, sdkVersion?: string }
 */
const {
  withAndroidManifest,
  withAppBuildGradle,
  AndroidConfig,
} = require('@expo/config-plugins');

const CLIENT_ID_META = 'com.truecaller.android.sdk.ClientId';
// READ_PHONE_STATE only. The restricted call-log permissions (READ_CALL_LOG,
// ANSWER_PHONE_CALLS) were removed in C0.1: Play's July 2026 policy update
// dropped account verification by phone call as a permitted use, and the
// missed-call flow they served is gone. Do not re-add them here — this plugin
// re-injects into AndroidManifest.xml at prebuild, so putting one back silently
// undoes the manifest fix. One-tap OAuth needs READ_PHONE_STATE and nothing more.
const PERMISSIONS = ['android.permission.READ_PHONE_STATE'];

function withTruecallerManifest(config, { clientId }) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    // clientId meta-data (idempotent upsert).
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      CLIENT_ID_META,
      clientId,
    );

    // Permissions.
    const manifest = cfg.modResults;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of PERMISSIONS) {
      const exists = manifest['uses-permission'].some(
        (p) => p.$ && p.$['android:name'] === name,
      );
      if (!exists) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    return cfg;
  });
}

function withTruecallerGradle(config, { sdkVersion }) {
  return withAppBuildGradle(config, (cfg) => {
    const dep = `implementation 'com.truecaller.android.sdk:truecaller-sdk:${sdkVersion}'`;
    if (!cfg.modResults.contents.includes('com.truecaller.android.sdk:truecaller-sdk')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        (m) => `${m}\n    ${dep}`,
      );
    }
    return cfg;
  });
}

module.exports = function withTruecaller(config, props = {}) {
  const clientId = props.clientId;
  if (!clientId) {
    throw new Error('withTruecaller: a `clientId` option is required.');
  }
  const sdkVersion = props.sdkVersion || '3.3.0';
  config = withTruecallerManifest(config, { clientId });
  config = withTruecallerGradle(config, { sdkVersion });
  return config;
};
