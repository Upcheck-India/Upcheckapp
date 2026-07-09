import * as Sentry from '@sentry/node';

/**
 * Initialise Sentry only when a DSN is provided (set SENTRY_DSN in the Render
 * env). With no DSN, Sentry.captureException() is a safe no-op, so the rest of
 * the app can call it unconditionally. Returns whether tracking is active.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Error tracking only for now — no perf tracing overhead.
    tracesSampleRate: 0,
  });
  return true;
}

export { Sentry };
