/**
 * Pond estimation — live estimates of biomass, survival, size and crop value
 * from the records a farmer already keeps. Pure functions, unit-tested.
 *
 * These compose the standard calculators in `./calculators` with a transparent,
 * species-specific growth model built from public aquaculture grow-out norms.
 * Estimates improve as the caller supplies measured inputs (a sampled average
 * weight or count) instead of relying on the modeled defaults.
 */
export type Species = 'vannamei' | 'monodon' | 'indicus'

// --- Core grow-out math (kept inline so this module is self-contained) ---

/** Standing biomass (kg) = mean body weight (g) × count ÷ 1000. */
export function biomass({
  averageWeightG,
  count,
}: {
  averageWeightG: number
  count: number
}): number {
  return (Math.max(0, averageWeightG) * Math.max(0, count)) / 1000
}

/** Survival rate (%) of current vs stocked animals, clamped to [0, 100]. */
export function survivalRate({
  stockedCount,
  currentCount,
}: {
  stockedCount: number
  currentCount: number
}): number {
  if (stockedCount <= 0) return 0
  return Math.min(100, Math.max(0, (currentCount / stockedCount) * 100))
}

/** Projected surviving count after `days` at a constant daily mortality rate. */
export function projectedSurvival({
  stockedCount,
  dailyMortalityRatePct,
  days,
}: {
  stockedCount: number
  dailyMortalityRatePct: number
  days: number
}): number {
  const rate = Math.max(0, dailyMortalityRatePct) / 100
  return stockedCount * Math.pow(1 - rate, Math.max(0, days))
}

const MS_PER_DAY = 86_400_000

/**
 * Growth anchors: days-of-culture -> mean body weight (g). Linear interpolation
 * between anchors; clamped at the ends. Figures are public grow-out ballparks,
 * not measured data — they exist only to give a first estimate before sampling.
 */
const GROWTH_ANCHORS: Record<Species, [number, number][]> = {
  vannamei: [
    [0, 0],
    [30, 3],
    [60, 9],
    [90, 17],
    [120, 24],
    [150, 30],
  ],
  monodon: [
    [0, 0],
    [30, 4],
    [60, 12],
    [90, 22],
    [120, 33],
    [150, 42],
  ],
  indicus: [
    [0, 0],
    [30, 3],
    [60, 8],
    [90, 15],
    [120, 22],
    [150, 28],
  ],
}

/** Coerce a free-text species string to a supported Species, defaulting safely. */
export function normalizeSpecies(raw: string | null | undefined): Species {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('monodon') || s.includes('tiger') || s.includes('black')) {
    return 'monodon'
  }
  if (s.includes('indicus')) return 'indicus'
  return 'vannamei'
}

/** Whole days of culture between stocking and the reference instant (>= 0). */
export function daysOfCulture(stockedAt: Date, asOf: Date): number {
  const diff = Math.floor((asOf.getTime() - stockedAt.getTime()) / MS_PER_DAY)
  return Math.max(0, diff)
}

/** Estimated mean body weight (g) for a species at a given day of culture. */
export function estimateAverageWeightG(species: Species, docDays: number): number {
  const anchors = GROWTH_ANCHORS[species] ?? GROWTH_ANCHORS.vannamei
  if (docDays <= anchors[0][0]) return anchors[0][1]
  const last = anchors[anchors.length - 1]
  if (docDays >= last[0]) {
    // Extrapolate beyond the last anchor at the final segment's slope.
    const [d0, w0] = anchors[anchors.length - 2]
    const [d1, w1] = last
    const slope = (w1 - w0) / (d1 - d0)
    return w1 + slope * (docDays - d1)
  }
  for (let i = 1; i < anchors.length; i++) {
    const [d1, w1] = anchors[i]
    if (docDays <= d1) {
      const [d0, w0] = anchors[i - 1]
      const t = (docDays - d0) / (d1 - d0)
      return w0 + t * (w1 - w0)
    }
  }
  return last[1]
}

/** Count per kilogram from mean body weight (the standard market size metric). */
export function countPerKg(averageWeightG: number): number {
  if (averageWeightG <= 0) return 0
  return 1000 / averageWeightG
}

export interface PondEstimateInput {
  species: Species
  stockedCount: number
  stockedAt: Date
  asOf: Date
  /** Assumed daily mortality (%). Default 0.2%/day is a common healthy grow-out. */
  dailyMortalityPct?: number
  /** Measured mean weight (g); overrides the growth model when provided. */
  measuredAverageWeightG?: number
  /** Measured current count; overrides the survival projection when provided. */
  measuredCount?: number
}

export interface PondEstimate {
  docDays: number
  averageWeightG: number
  estimatedCount: number
  survivalPct: number
  biomassKg: number
  countPerKg: number
}

/** Best-effort live estimate for one pond/crop. */
export function estimatePond(input: PondEstimateInput): PondEstimate {
  const {
    species,
    stockedCount,
    stockedAt,
    asOf,
    dailyMortalityPct = 0.2,
    measuredAverageWeightG,
    measuredCount,
  } = input

  const docDays = daysOfCulture(stockedAt, asOf)
  const averageWeightG =
    measuredAverageWeightG ?? estimateAverageWeightG(species, docDays)

  const estimatedCount =
    measuredCount ??
    projectedSurvival({ stockedCount, dailyMortalityRatePct: dailyMortalityPct, days: docDays })

  const survivalPct = survivalRate({ stockedCount, currentCount: estimatedCount })
  const biomassKg = biomass({ averageWeightG, count: estimatedCount })

  return {
    docDays,
    averageWeightG,
    estimatedCount,
    survivalPct,
    biomassKg,
    countPerKg: countPerKg(averageWeightG),
  }
}

/**
 * India count-based farm-gate price reference (INR/kg). Larger shrimp (fewer per
 * kg) fetch a higher price. These are neutral, configurable placeholder defaults
 * — NOT a live feed and NOT an endorsement of any buyer. Replace with the real
 * regional price feed when available.
 */
export const DEFAULT_PRICE_BY_COUNT: [number, number][] = [
  [20, 600],
  [30, 480],
  [40, 400],
  [50, 350],
  [60, 310],
  [70, 280],
  [100, 230],
]

/** Interpolate an INR/kg price from a count-per-kg value and a price table. */
export function priceForCount(
  countPerKgValue: number,
  table: [number, number][] = DEFAULT_PRICE_BY_COUNT,
): number {
  if (table.length === 0 || countPerKgValue <= 0) return 0
  const sorted = [...table].sort((a, b) => a[0] - b[0])
  if (countPerKgValue <= sorted[0][0]) return sorted[0][1]
  const last = sorted[sorted.length - 1]
  if (countPerKgValue >= last[0]) return last[1]
  for (let i = 1; i < sorted.length; i++) {
    const [c1, p1] = sorted[i]
    if (countPerKgValue <= c1) {
      const [c0, p0] = sorted[i - 1]
      const t = (countPerKgValue - c0) / (c1 - c0)
      return p0 + t * (p1 - p0)
    }
  }
  return last[1]
}

/** Estimated gross crop value (INR) at current size, using a price table. */
export function estimateCropValue(
  estimate: PondEstimate,
  table: [number, number][] = DEFAULT_PRICE_BY_COUNT,
): number {
  const price = priceForCount(estimate.countPerKg, table)
  return estimate.biomassKg * price
}

export interface CropLike {
  /** Free-text species; normalized internally. */
  species: string
  stockedCount: number
  /** ISO date string. */
  stockedAt: string
}

export interface FarmEstimate {
  cropCount: number
  totalBiomassKg: number
  totalValueINR: number
  /** Survival weighted by stocked count across all crops (0–100). */
  weightedSurvivalPct: number
}

/** Aggregate live estimates across a set of crops (e.g. all active crops). */
export function estimateFarm(
  crops: CropLike[],
  asOf: Date,
  table: [number, number][] = DEFAULT_PRICE_BY_COUNT,
): FarmEstimate {
  let totalBiomassKg = 0
  let totalValueINR = 0
  let survivalWeightedSum = 0
  let stockedTotal = 0

  for (const crop of crops) {
    const est = estimatePond({
      species: normalizeSpecies(crop.species),
      stockedCount: crop.stockedCount,
      stockedAt: new Date(crop.stockedAt),
      asOf,
    })
    totalBiomassKg += est.biomassKg
    totalValueINR += estimateCropValue(est, table)
    survivalWeightedSum += est.survivalPct * crop.stockedCount
    stockedTotal += crop.stockedCount
  }

  return {
    cropCount: crops.length,
    totalBiomassKg,
    totalValueINR,
    weightedSurvivalPct: stockedTotal > 0 ? survivalWeightedSum / stockedTotal : 0,
  }
}

export default {
  normalizeSpecies,
  estimateFarm,
  daysOfCulture,
  estimateAverageWeightG,
  countPerKg,
  estimatePond,
  priceForCount,
  estimateCropValue,
  DEFAULT_PRICE_BY_COUNT,
}
