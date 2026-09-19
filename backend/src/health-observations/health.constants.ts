/**
 * Vocabularies for health observations, mortality causes and disease records
 * (spec 2026-09-19 disease/health D6). The app mirrors these in
 * `frontend/src/api/healthObservations.ts`.
 */
export const HEALTH_SIGNS = [
  'soft_shell',
  'white_feces',
  'red_body',
  'empty_gut',
  'loose_shell',
  'black_gill',
  'luminescence',
  'surface_gathering',
  'erratic_swimming',
  'white_spots',
  'pale_hp',
] as const;
export type HealthSign = (typeof HEALTH_SIGNS)[number];

export const HEALTH_LEVELS = ['none', 'few', 'many'] as const;
export type HealthLevel = (typeof HEALTH_LEVELS)[number];

export const HEALTH_SOURCES = ['quick', 'sampling', 'harvest', 'tray'] as const;

export const MORTALITY_CAUSES = [
  'unknown',
  'low_do',
  'disease',
  'molt',
  'handling',
  'predator',
  'other',
] as const;

export const DISEASE_SEVERITIES = ['mild', 'moderate', 'severe'] as const;
export type DiseaseSeverity = (typeof DISEASE_SEVERITIES)[number];

export const CONFIRMED_BY = ['suspected', 'microscopy', 'pcr', 'lab_other'] as const;

export const DISEASE_OUTCOMES = [
  'ongoing',
  'recovered',
  'emergency_harvest',
  'crop_lost',
] as const;

/**
 * Old free-text severity (`'Mild'`, mild/moderate/severe, high/medium/low) →
 * the one vocabulary. Same map as migration 1780701500000's backfill
 * (`LEGACY_SEVERITY`); a spec keeps the two in step.
 */
export function normaliseSeverity(
  v: string | null | undefined,
): DiseaseSeverity | null {
  switch ((v ?? '').trim().toLowerCase()) {
    case 'mild':
    case 'low':
    case 'minor':
      return 'mild';
    case 'moderate':
    case 'medium':
      return 'moderate';
    case 'severe':
    case 'high':
    case 'critical':
      return 'severe';
    default:
      return null;
  }
}

/** Postgres undefined_table / undefined_column — schema not migrated yet. */
export const isMissingSchema = (err: any): boolean =>
  ['42P01', '42703'].includes(err?.code ?? err?.driverError?.code);
