import { nextPhase } from '../lunar/moon-phase-meeus';
import { toIstDateString } from '../common/ist-date';

/**
 * Molt windows — pure date math around each TRUE new/full moon, in IST
 * calendar days (spec 2026-09-14 §1).
 *
 *   pre  = peak−3d .. peak−2d
 *   peak = peak−1d .. peak+1d
 *   post = peak+2d .. peak+3d
 *
 * The peak DATE is the IST day of the true phase instant: a phase at 20:00 UTC
 * is the next calendar day in IST, which is the day the farmer's Panchang names.
 * Every consumer (alerts, checklist, feed advisor, app) keys off this one file.
 */
export type MoltPhase = 'pre' | 'peak' | 'post' | 'inter';

export interface MoltWindow {
  /** `YYYY-MM-DD-new|full` — IST peak date + kind. */
  key: string;
  kind: 'new' | 'full';
  preStart: string;
  peakStart: string;
  peakDate: string;
  peakEnd: string;
  postEnd: string;
}

/** Add whole days to a `YYYY-MM-DD` string (calendar arithmetic, no TZ). */
export const addDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);

export const windowForPeak = (instant: Date, kind: 'new' | 'full'): MoltWindow => {
  const peakDate = toIstDateString(instant);
  return {
    key: `${peakDate}-${kind}`,
    kind,
    preStart: addDays(peakDate, -3),
    peakStart: addDays(peakDate, -1),
    peakDate,
    peakEnd: addDays(peakDate, 1),
    postEnd: addDays(peakDate, 3),
  };
};

/** Phase of an IST day relative to a window. */
export const phaseOn = (w: MoltWindow, day: string): MoltPhase => {
  if (day < w.preStart || day > w.postEnd) return 'inter';
  if (day < w.peakStart) return 'pre';
  if (day <= w.peakEnd) return 'peak';
  return 'post';
};

/**
 * Windows not yet over (postEnd ≥ today IST), current one first, in order.
 * Starts the phase search a few days back so a window in progress is found.
 */
export const upcomingWindows = (now: Date, count = 3): MoltWindow[] => {
  const today = toIstDateString(now);
  const out: MoltWindow[] = [];
  let cursor = new Date(now.getTime() - 5 * 86_400_000);
  // Bounded: new and full alternate ~14.8 days apart.
  for (let i = 0; i < count * 2 + 4 && out.length < count; i++) {
    const n = nextPhase(cursor, true);
    const f = nextPhase(cursor, false);
    const isNew = n.getTime() <= f.getTime();
    const instant = isNew ? n : f;
    const w = windowForPeak(instant, isNew ? 'new' : 'full');
    if (w.postEnd >= today) out.push(w);
    cursor = new Date(instant.getTime() + 86_400_000);
  }
  return out;
};

/** The window today falls in (or null) and today's phase. */
export const currentMoltWindow = (
  now: Date,
): { window: MoltWindow | null; phase: MoltPhase; next: MoltWindow } => {
  const [first, second] = upcomingWindows(now, 2);
  const phase = phaseOn(first, toIstDateString(now));
  return phase === 'inter'
    ? { window: null, phase, next: first }
    : { window: first, phase, next: second };
};
