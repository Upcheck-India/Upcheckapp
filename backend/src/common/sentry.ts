import * as Sentry from '@sentry/node';
import {
  scrubEvent,
  scrubBreadcrumb,
  IGNORE_ERRORS,
} from './sentry-scrub';

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
    // Performance tracing at a low default rate (5% of requests) so slow
    // endpoints show up in Sentry. SENTRY_TRACES_SAMPLE_RATE=0 turns it off.
    // Only the http-level span is guaranteed: init runs after Nest and pg are
    // imported, so their auto-instrumentation may not attach — the
    // Server-Timing header / slow-request log (common/request-timing) carries
    // the per-request DB breakdown.
    tracesSampleRate: tracesSampleRate(),
    // Never let the SDK attach IPs, cookies, headers or bodies on its own.
    sendDefaultPii: false,
    ignoreErrors: IGNORE_ERRORS,
    // Privacy Policy §6: reports carry no credentials, phone numbers, emails
    // or money/harvest values, and identify an account only by a hash.
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  });
  return true;
}

/** 0..1 from SENTRY_TRACES_SAMPLE_RATE; 0.05 when unset or out of range. */
export function tracesSampleRate(
  raw = process.env.SENTRY_TRACES_SAMPLE_RATE,
): number {
  const n = raw == null || raw === '' ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.05;
}

export { Sentry };
