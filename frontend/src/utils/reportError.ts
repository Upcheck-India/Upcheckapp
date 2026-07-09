/**
 * Single choke-point for reporting a caught/fatal error. Today it just logs;
 * this is the ONE place to wire a crash reporter (OBS-1) when a DSN exists.
 *
 * ponytail: console-only until a reporter is provisioned — add
 * `Sentry.captureException(error, { extra: context })` (or Crashlytics) right
 * here and nothing else in the app has to change.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.error('[reportError]', error, context ?? '');
}
