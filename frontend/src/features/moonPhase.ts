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
  /** True when within the molting window around new or full moon. */
  isMoltingWindow: boolean
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
 * Distance (in synodic days) from the nearest new OR full moon. Used to decide
 * whether we are in a molting window. Returns a value in [0, SYNODIC_MONTH / 4].
 */
function daysFromNewOrFull(ageDays: number): number {
  const half = SYNODIC_MONTH / 2
  const dNew = Math.min(ageDays, SYNODIC_MONTH - ageDays) // distance to a new moon
  const dFull = Math.abs(ageDays - half) // distance to the full moon
  return Math.min(dNew, dFull)
}

/**
 * Compute the moon phase for a given instant.
 *
 * @param date    Instant to evaluate (defaults left to the caller — pass one).
 * @param windowDays  Half-width of the molting window around new/full, in days.
 *                    Default 2.0 to match the backend lunar service.
 */
export function moonPhase(date: Date, windowDays = 2.0): MoonPhase {
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
    isMoltingWindow: daysFromNewOrFull(ageDays) <= windowDays,
  }
}

export interface UpcomingPhase {
  name: MoonPhaseName
  emoji: string
  /** The date the principal phase is reached. */
  date: Date
  /** Whole days from the reference instant (rounded). */
  inDays: number
}

/** The four principal phases as fractions of the synodic month. */
const PRINCIPAL_PHASES: { name: MoonPhaseName; emoji: string; fraction: number }[] =
  [
    { name: 'New Moon', emoji: '🌑', fraction: 0 },
    { name: 'First Quarter', emoji: '🌓', fraction: 0.25 },
    { name: 'Full Moon', emoji: '🌕', fraction: 0.5 },
    { name: 'Last Quarter', emoji: '🌗', fraction: 0.75 },
  ]

/**
 * The next `count` principal phases (new / first quarter / full / last quarter)
 * after the given instant, in chronological order.
 */
export function upcomingPhases(date: Date, count = 4): UpcomingPhase[] {
  const elapsedDays = (date.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY
  const cyclesSoFar = Math.floor(elapsedDays / SYNODIC_MONTH)

  const candidates: UpcomingPhase[] = []
  // Look across a couple of cycles to comfortably collect `count` future events.
  for (let cycle = cyclesSoFar; cycle <= cyclesSoFar + 2; cycle++) {
    for (const phase of PRINCIPAL_PHASES) {
      const dayOffset = (cycle + phase.fraction) * SYNODIC_MONTH
      const ms = REFERENCE_NEW_MOON_MS + dayOffset * MS_PER_DAY
      if (ms <= date.getTime()) continue
      candidates.push({
        name: phase.name,
        emoji: phase.emoji,
        date: new Date(ms),
        inDays: Math.round((ms - date.getTime()) / MS_PER_DAY),
      })
    }
  }

  return candidates.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, count)
}

export default { moonPhase, upcomingPhases, SYNODIC_MONTH }
