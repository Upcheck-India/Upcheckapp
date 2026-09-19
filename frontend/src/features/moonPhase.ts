/**
 * Moon-phase computation — pure astronomical math, no dependencies, no network.
 *
 * Shrimp molting is loosely synchronized with the lunar cycle (molting tends to
 * peak around new and full moon / spring tides), so a moon-phase widget is a
 * cheap, farmer-loved feature. The math here is standard public-domain astronomy
 * (mean synodic phase from a known new-moon epoch) — it is an approximation good
 * to well under a day, which is more than enough for a molting hint.
 *
 * All functions are pure: callers pass the reference `Date` so results are
 * deterministic and unit-testable.
 */

/** Mean length of a synodic month (new moon to new moon), in days. */
export const SYNODIC_MONTH = 29.53058867

/**
 * Reference new moon: 2000-01-06 18:14 UTC.
 * Expressed as a Unix epoch millisecond value so we never depend on the host
 * timezone.
 */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0)

const MS_PER_DAY = 86_400_000

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent'

export interface MoonPhase {
  /** Age of the moon in days since the last new moon (0 .. ~29.53). */
  ageDays: number
  /** Phase position as a fraction of the synodic month, 0 (new) .. 1 (next new). */
  fraction: number
  /** Illuminated fraction of the visible disc, 0 (new) .. 1 (full). */
  illumination: number
  /** Named phase bucket. */
  name: MoonPhaseName
  /** Emoji glyph for quick display. */
  emoji: string
}

/** Phase buckets, centered on the canonical positions, in synodic-fraction units. */
const PHASE_BUCKETS: { name: MoonPhaseName; emoji: string }[] = [
  { name: 'New Moon', emoji: '🌑' },
  { name: 'Waxing Crescent', emoji: '🌒' },
  { name: 'First Quarter', emoji: '🌓' },
  { name: 'Waxing Gibbous', emoji: '🌔' },
  { name: 'Full Moon', emoji: '🌕' },
  { name: 'Waning Gibbous', emoji: '🌖' },
  { name: 'Last Quarter', emoji: '🌗' },
  { name: 'Waning Crescent', emoji: '🌘' },
]

/**
 * Compute the moon phase for a given instant.
 * Illumination and phase name only: molt windows are the server's true-phase
 * windows (/molt/windows), never this mean-phase approximation (M1.7).
 *
 * @param date    Instant to evaluate (defaults left to the caller — pass one).
 */
export function moonPhase(date: Date): MoonPhase {
  const elapsedDays = (date.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY
  // Positive modulo so dates before the epoch still map into [0, SYNODIC_MONTH).
  const ageDays =
    ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  const fraction = ageDays / SYNODIC_MONTH

  // Illuminated fraction of the disc: 0 at new, 1 at full.
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2

  // Map fraction to one of 8 buckets, each 1/8 of the cycle wide and centered
  // on its canonical position (so e.g. "Full Moon" spans the middle eighth).
  const bucket =
    Math.round(fraction * 8) % 8 // 0..7, wraps 8 -> 0 (back to New Moon)
  const { name, emoji } = PHASE_BUCKETS[bucket]

  return {
    ageDays,
    fraction,
    illumination,
    name,
    emoji,
  }
}

export default { moonPhase, SYNODIC_MONTH }
