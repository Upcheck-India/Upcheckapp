/**
 * Per-species five-zone water-quality thresholds — the backend copy of
 * `frontend/src/features/waterQualityThresholds.ts` (spec 2026-09-14 "Threshold
 * unification"). The Day Score, the persisted water-quality alerts and the live
 * engine alerts all read this one table, so the colour a farmer sees, the alert
 * they get and the score they are given cannot disagree.
 *
 * Values MUST stay identical to the frontend file: `wq-thresholds.spec.ts`
 * transpiles that file and fails on any drift.
 */

export type ThresholdSpecies = 'vannamei' | 'monodon' | 'indicus' | 'scampi';

export type ThresholdParam =
  | 'do'
  | 'ph'
  | 'temperature'
  | 'salinity'
  | 'alkalinity'
  | 'ammonia'
  | 'nitrite'
  | 'nitrate'
  | 'transparency'
  | 'hardness';

export type FiveZone =
  | 'critical-low'
  | 'caution-low'
  | 'optimal'
  | 'caution-high'
  | 'critical-high';

/** Three-level zone used by the Daily Brief contract. */
export type Zone = 'optimal' | 'caution' | 'critical';

export interface FiveZoneThreshold {
  criticalLow?: number | null;
  cautionLow?: number | null;
  cautionHigh?: number | null;
  criticalHigh?: number | null;
}

const VANNAMEI: Record<ThresholdParam, FiveZoneThreshold> = {
  do: { criticalLow: 3, cautionLow: 4, cautionHigh: null, criticalHigh: null },
  ph: { criticalLow: 7.0, cautionLow: 7.5, cautionHigh: 8.5, criticalHigh: 9.0 },
  temperature: { criticalLow: 24, cautionLow: 28, cautionHigh: 32, criticalHigh: 35 },
  salinity: { criticalLow: 5, cautionLow: 10, cautionHigh: 25, criticalHigh: 35 },
  alkalinity: { criticalLow: 50, cautionLow: 100, cautionHigh: 150, criticalHigh: 250 },
  ammonia: { criticalLow: null, cautionLow: null, cautionHigh: 0.1, criticalHigh: 0.5 },
  nitrite: { criticalLow: null, cautionLow: null, cautionHigh: 1.0, criticalHigh: 4.0 },
  nitrate: { criticalLow: null, cautionLow: null, cautionHigh: 60, criticalHigh: 200 },
  transparency: { criticalLow: 20, cautionLow: 30, cautionHigh: 45, criticalHigh: 60 },
  hardness: { criticalLow: null, cautionLow: 20, cautionHigh: 150, criticalHigh: null },
};

const withOverrides = (
  overrides: Partial<Record<ThresholdParam, FiveZoneThreshold>>,
): Record<ThresholdParam, FiveZoneThreshold> => ({ ...VANNAMEI, ...overrides });

export const THRESHOLDS: Record<ThresholdSpecies, Record<ThresholdParam, FiveZoneThreshold>> = {
  vannamei: VANNAMEI,
  monodon: withOverrides({
    salinity: { criticalLow: 5, cautionLow: 10, cautionHigh: 30, criticalHigh: 40 },
    temperature: { criticalLow: 24, cautionLow: 27, cautionHigh: 32, criticalHigh: 35 },
  }),
  indicus: withOverrides({
    salinity: { criticalLow: 5, cautionLow: 12, cautionHigh: 30, criticalHigh: 40 },
  }),
  scampi: withOverrides({
    salinity: { criticalLow: null, cautionLow: null, cautionHigh: 8, criticalHigh: 15 },
    temperature: { criticalLow: 22, cautionLow: 26, cautionHigh: 31, criticalHigh: 34 },
    ph: { criticalLow: 6.5, cautionLow: 7.0, cautionHigh: 8.5, criticalHigh: 9.0 },
  }),
};

/**
 * Free (un-ionised) NH3, mg/L. Not per-species and not in the frontend table:
 * the engine alert's long-standing 0.1 / 0.3 bands (spec: "unchanged").
 */
export const FREE_NH3: FiveZoneThreshold = { cautionHigh: 0.1, criticalHigh: 0.3 };

/** Free-text species → supported species, or null when it matches nothing. */
export function toThresholdSpecies(raw: string | null | undefined): ThresholdSpecies | null {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('monodon') || s.includes('tiger') || s.includes('black')) return 'monodon';
  if (s.includes('indicus')) return 'indicus';
  if (s.includes('scampi') || s.includes('macrobrachium') || s.includes('rosenbergii')) {
    return 'scampi';
  }
  if (s.includes('vannamei')) return 'vannamei';
  return null;
}

export function getThreshold(species: ThresholdSpecies, parameter: ThresholdParam): FiveZoneThreshold {
  return (THRESHOLDS[species] ?? VANNAMEI)[parameter];
}

/** Threshold for a free-text species, vannamei when unrecognised. */
export const thresholdFor = (species: string | null | undefined, parameter: ThresholdParam) =>
  getThreshold(toThresholdSpecies(species) ?? 'vannamei', parameter);

export function classifyZone(value: number, t: FiveZoneThreshold): FiveZone {
  if (t.criticalLow != null && value < t.criticalLow) return 'critical-low';
  if (t.cautionLow != null && value < t.cautionLow) return 'caution-low';
  if (t.criticalHigh != null && value > t.criticalHigh) return 'critical-high';
  if (t.cautionHigh != null && value > t.cautionHigh) return 'caution-high';
  return 'optimal';
}

/** Five zones → the brief's three. */
export function classify(value: number, t: FiveZoneThreshold): Zone {
  const z = classifyZone(value, t);
  if (z === 'optimal') return 'optimal';
  return z.startsWith('critical') ? 'critical' : 'caution';
}

export const isCritical = (value: number | null | undefined, t: FiveZoneThreshold): boolean =>
  value != null && !Number.isNaN(value) && classify(value, t) === 'critical';
