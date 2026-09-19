/**
 * Molt-window date helpers. The windows themselves come from the backend
 * (`GET /molt/windows`, true Meeus phase, IST calendar days) — this file only
 * asks "which window/phase is this IST day in?", with the same rule as
 * backend/src/molt/molt-window.ts:
 *   pre = peak−3..peak−2, peak = peak−1..peak+1, post = peak+2..peak+3.
 */
export type MoltPhase = 'pre' | 'peak' | 'post' | 'inter';

export interface MoltWindow {
  key: string;
  kind: 'new' | 'full';
  preStart: string;
  peakStart: string;
  peakDate: string;
  peakEnd: string;
  postEnd: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` of an instant in IST (the backend's day boundary). */
export const istDateString = (d: Date): string =>
  new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

export const phaseOn = (w: MoltWindow, day: string): MoltPhase => {
  if (day < w.preStart || day > w.postEnd) return 'inter';
  if (day < w.peakStart) return 'pre';
  if (day <= w.peakEnd) return 'peak';
  return 'post';
};

/** The window containing `day` (a `YYYY-MM-DD` string), with its phase, or null. */
export const windowContaining = (
  windows: MoltWindow[] | undefined,
  day: string,
): { window: MoltWindow; phase: Exclude<MoltPhase, 'inter'> } | null => {
  for (const w of windows ?? []) {
    const phase = phaseOn(w, day);
    if (phase !== 'inter') return { window: w, phase };
  }
  return null;
};

/** Calendar arithmetic on a `YYYY-MM-DD` string. */
export const addDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
