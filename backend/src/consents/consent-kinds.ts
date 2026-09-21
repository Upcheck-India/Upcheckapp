/**
 * Every consent the app records (spec 2026-09-20 C2.1, C3).
 *
 * The spec listed a single 'ml_training'; C3 requires photos to be a SEPARATE
 * choice from farm records, so it is two kinds. Mirrored in
 * frontend/src/features/consent.ts — change both together.
 */
export const CONSENT_KINDS = [
  'terms',
  'privacy',
  'analytics',
  'crash',
  'ml_training_records',
  'ml_training_photos',
] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const CONSENT_SOURCES = ['signup', 'settings', 'reconsent'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export type TrainingScope = 'records' | 'photos';
