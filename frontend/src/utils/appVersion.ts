import * as Application from 'expo-application';
import Constants from 'expo-constants';

/**
 * The binary's own version and build, read at runtime instead of typed in.
 *
 * Both settings screens used to render the literal "v1.0.0", which was already
 * drifting (app.config carries version 1.0.0 but runtimeVersion 2.0.0) and
 * would rot again on the next bump.
 *
 * The version comes from the RUNNING update's app config first: an OTA carries
 * app.config's `version`, so bumping it there shows up without a native build.
 * The binary's own versionName (frozen at build time) is the fallback. The
 * build number stays native — it only changes with a new binary.
 */
export const appVersion = (): string =>
    Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? '—';

export const appBuild = (): string => Application.nativeBuildVersion ?? '—';
