import { nextPhase } from '../lunar/moon-phase-meeus';
import { MoltWindow, windowForPeak, addDays, phaseOn } from '../molt/molt-window';
import { isMortalitySpike } from '../daily-brief/day-score';

/**
 * Pure pieces of the Cycle Result (harvest-and-molt H3). The service gathers
 * rows; everything that decides a number or a sentence lives here so it can be
 * tested without a database.
 */

/** Uncalibrated bands, "typical for vannamei in India" (H3). */
export const FCR_BANDS = { good: 1.3, fair: 1.6 } as const;
export const SR_BANDS = { good: 80, fair: 65 } as const;
/** ABW uncertainty behind an estimated piece count (H3: ±10%). */
const ABW_SPREAD = 0.1;
/** Stocking ABW when the crop records no PL weight (H3), noted in the result. */
export const DEFAULT_PL_ABW_G = 0.01;

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface ResultHarvest {
  harvestDate: string | Date;
  weightKg: number;
  averageSize: number | null; // g/piece
  pieces: number | null;
  piecesEstimated: boolean;
  rejectedKg: number | null;
  rejectedReason: string | null;
  grades: { countPerKg: number | null; weightKg: number }[];
}

export interface Survival {
  pct: number;
  /** Present only when some pieces were estimated from ABW. */
  low: number | null;
  high: number | null;
  estimated: boolean;
}

/**
 * Harvested pieces ÷ stocked. NEVER the sampling SR estimate (C2). A harvest
 * with no counted pieces is estimated from its own avg size, else from the
 * latest ABW; with neither, survival is unknown (null), not guessed.
 */
export function survivalFrom(
  harvests: ResultHarvest[],
  stocked: number | null | undefined,
  latestAbwG: number | null,
): Survival | null {
  if (!stocked || stocked <= 0 || harvests.length === 0) return null;
  let exact = 0;
  let est = 0;
  for (const h of harvests) {
    if (h.pieces != null && !h.piecesEstimated) exact += Number(h.pieces);
    else if (h.pieces != null) est += Number(h.pieces);
    else {
      const g = h.averageSize ?? latestAbwG;
      if (!g || g <= 0) return null;
      est += (Number(h.weightKg) * 1000) / g;
    }
  }
  const pct = (n: number) => r1((n / stocked) * 100);
  if (est === 0) return { pct: pct(exact), low: null, high: null, estimated: false };
  // A heavier true ABW means fewer pieces, and vice versa.
  return {
    pct: pct(exact + est),
    low: pct(exact + est / (1 + ABW_SPREAD)),
    high: pct(exact + est / (1 - ABW_SPREAD)),
    estimated: true,
  };
}

/** Weighted avg count/kg and the grade mix, graded lines first, else avg size. */
export function gradeStats(harvests: ResultHarvest[]) {
  const mix = new Map<number, number>();
  let kg = 0;
  let pieces = 0;
  for (const h of harvests) {
    const lines = h.grades.length
      ? h.grades
      : [{ countPerKg: h.averageSize ? 1000 / h.averageSize : null, weightKg: h.weightKg }];
    for (const g of lines) {
      if (g.countPerKg == null || g.countPerKg <= 0) continue;
      const w = Number(g.weightKg);
      kg += w;
      pieces += w * Number(g.countPerKg);
      const band = Math.round(Number(g.countPerKg));
      mix.set(band, (mix.get(band) ?? 0) + w);
    }
  }
  const total = [...mix.values()].reduce((s, v) => s + v, 0);
  return {
    avgCount: kg > 0 ? Math.round(pieces / kg) : null,
    gradeMix: [...mix.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([countPerKg, w]) => ({ countPerKg, kg: r2(w), pct: r1((w / total) * 100) })),
  };
}

export const fcrBand = (fcr: number | null) =>
  fcr == null ? null : fcr <= FCR_BANDS.good ? 'good' : fcr <= FCR_BANDS.fair ? 'fair' : 'poor';
export const srBand = (sr: number | null) =>
  sr == null ? null : sr >= SR_BANDS.good ? 'good' : sr >= SR_BANDS.fair ? 'fair' : 'poor';

/** Every molt window whose span touches [start, end] (IST days). */
export function moltWindowsBetween(start: string, end: string): MoltWindow[] {
  const out: MoltWindow[] = [];
  let cursor = new Date(Date.parse(`${addDays(start, -5)}T00:00:00Z`));
  // Bounded: ~2 windows a month; a year-long cycle is ~25.
  for (let i = 0; i < 60; i++) {
    const n = nextPhase(cursor, true);
    const f = nextPhase(cursor, false);
    const isNew = n.getTime() <= f.getTime();
    const instant = isNew ? n : f;
    const w = windowForPeak(instant, isNew ? 'new' : 'full');
    if (w.preStart > end) break;
    if (w.postEnd >= start) out.push(w);
    cursor = new Date(instant.getTime() + 86_400_000);
  }
  return out;
}

export const inPeak = (windows: MoltWindow[], day: string) =>
  windows.some((w) => phaseOn(w, day) === 'peak');
export const inMoltWindow = (windows: MoltWindow[], day: string) =>
  windows.some((w) => phaseOn(w, day) !== 'inter');

/** The day with the largest mortality spike (day-score rule), or null. */
export function worstMortalitySpike(rows: { day: string; count: number }[]): string | null {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + Number(r.count));
  const days = [...byDay.keys()].sort();
  let worst: { day: string; ratio: number } | null = null;
  for (const day of days) {
    const m = byDay.get(day)!;
    let sum = 0;
    for (let i = 1; i <= 7; i++) sum += byDay.get(addDays(day, -i)) ?? 0;
    const avg7 = sum / 7;
    if (!isMortalitySpike(m, avg7)) continue;
    const ratio = m / Math.max(avg7, 1);
    if (!worst || ratio > worst.ratio) worst = { day, ratio };
  }
  return worst?.day ?? null;
}

export interface NextCycleLine {
  key: 'feedOver' | 'mortalitySpike' | 'softShellMolt';
  params: Record<string, string | number>;
}

/**
 * At most three lines, each only from a real delta (H3). No generic advice:
 * when nothing applies the list is empty and the section is absent.
 */
export function nextCycleLines(input: {
  fcr: number | null;
  feedKg: number;
  harvestedKg: number;
  survival: Survival | null;
  spikeDay: string | null;
  softShellRejectedKgInMolt: number;
}): NextCycleLine[] {
  const lines: NextCycleLine[] = [];
  if (fcrBand(input.fcr) === 'poor') {
    const over = Math.round(input.feedKg - FCR_BANDS.good * input.harvestedKg);
    if (over > 0) lines.push({ key: 'feedOver', params: { kg: over } });
  }
  // Low even at the top of an estimated range, and the logs show when.
  const srTop = input.survival ? input.survival.high ?? input.survival.pct : null;
  if (srTop != null && srTop < SR_BANDS.fair && input.spikeDay) {
    lines.push({ key: 'mortalitySpike', params: { date: input.spikeDay } });
  }
  if (input.softShellRejectedKgInMolt > 0) {
    lines.push({ key: 'softShellMolt', params: { kg: r1(input.softShellRejectedKgInMolt) } });
  }
  return lines.slice(0, 3);
}
