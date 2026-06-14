/**
 * Growth & harvest projection — forward-looks a crop to a target size: when it
 * will reach harvest weight, expected count/biomass at that point, the feed
 * required to get there, and a first-order feed-cost / revenue / margin estimate.
 *
 * Pure functions, unit-tested. Composes the species growth model and survival /
 * biomass / count-price math already in `./estimation` (single source of truth),
 * so projections stay consistent with the live estimate cards.
 *
 * This is decision-support, not a guarantee: real growth depends on feed, water
 * quality and health. Projections improve when a measured current weight is
 * supplied instead of the modeled default.
 */
import {
  Species,
  daysOfCulture,
  estimateAverageWeightG,
  projectedSurvival,
  survivalRate,
  biomass,
  countPerKg,
  priceForCount,
  DEFAULT_PRICE_BY_COUNT,
} from './estimation'

const MS_PER_DAY = 86_400_000
/** Upper bound on grow-out length we search for a target size (days). */
const MAX_DOC = 220

/**
 * Feeding rate (% of biomass/day) as a function of mean body weight. Standard
 * declining schedule for penaeid grow-out — large shrimp eat a smaller fraction
 * of their body weight than juveniles. Public-norm anchors, interpolated.
 */
// Per-species feed-rate (%/day) vs mean weight (g), interpolated. Larger shrimp
// eat a smaller fraction of their body weight. Mirrors the backend FR tables;
// values are public-norm ballparks, tunable per local feed brand.
const FEED_RATE_ANCHORS: Record<Species, [number, number][]> = {
  vannamei: [[0, 12], [1, 8], [3, 6], [5, 4.5], [10, 3.4], [15, 2.8], [20, 2.4], [30, 1.9]],
  indicus: [[0, 12], [1, 8], [3, 6], [5, 4.5], [10, 3.4], [15, 2.8], [20, 2.4], [30, 1.9]],
  // Tiger prawn — grows larger; slightly higher tail across its longer cycle.
  monodon: [[0, 11], [1, 8], [3, 6], [5, 4.8], [10, 3.6], [15, 3.0], [20, 2.6], [30, 2.1], [40, 1.8]],
  // Freshwater prawn — lower, flatter curve.
  scampi: [[0, 10], [1, 8], [3, 6], [6, 4.5], [12, 3.5], [20, 2.8], [30, 2.4]],
}

/** Interpolated feeding rate (%/day) for a species at a given mean weight (g). */
export function feedRateForWeight(weightG: number, species: Species = 'vannamei'): number {
  const a = FEED_RATE_ANCHORS[species] ?? FEED_RATE_ANCHORS.vannamei
  if (weightG <= a[0][0]) return a[0][1]
  const last = a[a.length - 1]
  if (weightG >= last[0]) return last[1]
  for (let i = 1; i < a.length; i++) {
    if (weightG <= a[i][0]) {
      const [w0, r0] = a[i - 1]
      const [w1, r1] = a[i]
      const t = (weightG - w0) / (w1 - w0)
      return r0 + t * (r1 - r0)
    }
  }
  return last[1]
}

/**
 * First day of culture at which the species growth model reaches `targetWeightG`.
 * Returns MAX_DOC if the target isn't reached within the search horizon.
 */
export function docDaysForWeight(species: Species, targetWeightG: number): number {
  for (let doc = 0; doc <= MAX_DOC; doc++) {
    if (estimateAverageWeightG(species, doc) >= targetWeightG) return doc
  }
  return MAX_DOC
}

export interface GrowthPoint {
  docDay: number
  weightG: number
  count: number
  biomassKg: number
}

export interface ProjectGrowthInput {
  species: Species
  stockedCount: number
  fromDocDay: number
  toDocDay: number
  dailyMortalityPct?: number
  /** Sample points across the range (default ~8). */
  steps?: number
}

/** A series of projected growth points between two days of culture (inclusive). */
export function projectGrowthSeries(input: ProjectGrowthInput): GrowthPoint[] {
  const { species, stockedCount, fromDocDay, toDocDay, dailyMortalityPct = 0.2 } = input
  const from = Math.max(0, Math.floor(fromDocDay))
  const to = Math.max(from, Math.floor(toDocDay))
  const steps = Math.max(1, input.steps ?? 8)
  const stride = Math.max(1, Math.round((to - from) / steps))

  const points: GrowthPoint[] = []
  for (let doc = from; doc <= to; doc += stride) {
    const weightG = estimateAverageWeightG(species, doc)
    const count = projectedSurvival({ stockedCount, dailyMortalityRatePct: dailyMortalityPct, days: doc })
    points.push({ docDay: doc, weightG, count, biomassKg: biomass({ averageWeightG: weightG, count }) })
  }
  if (points.length === 0 || points[points.length - 1].docDay !== to) {
    const weightG = estimateAverageWeightG(species, to)
    const count = projectedSurvival({ stockedCount, dailyMortalityRatePct: dailyMortalityPct, days: to })
    points.push({ docDay: to, weightG, count, biomassKg: biomass({ averageWeightG: weightG, count }) })
  }
  return points
}

/**
 * Feed (kg) required to grow from `fromDocDay` to `toDocDay`, integrated daily as
 * biomass × feeding-rate. Uses projected survival for the standing biomass each day.
 */
export function projectFeedKg(input: {
  species: Species
  stockedCount: number
  fromDocDay: number
  toDocDay: number
  dailyMortalityPct?: number
}): number {
  const { species, stockedCount, fromDocDay, toDocDay, dailyMortalityPct = 0.2 } = input
  const from = Math.max(0, Math.floor(fromDocDay))
  const to = Math.max(from, Math.floor(toDocDay))
  let feedKg = 0
  for (let doc = from + 1; doc <= to; doc++) {
    const weightG = estimateAverageWeightG(species, doc)
    const count = projectedSurvival({ stockedCount, dailyMortalityRatePct: dailyMortalityPct, days: doc })
    const biomassKg = biomass({ averageWeightG: weightG, count })
    feedKg += (biomassKg * feedRateForWeight(weightG, species)) / 100
  }
  return feedKg
}

export interface HarvestProjectionInput {
  species: Species
  stockedCount: number
  stockedAt: Date
  asOf: Date
  /** Target harvest weight (g). */
  targetWeightG: number
  dailyMortalityPct?: number
  /** Measured current mean weight (g); overrides the model when provided. */
  measuredWeightG?: number
  /** Feed price (INR/kg) for the cost estimate. */
  feedPricePerKgINR?: number
  /** Optional count→price table (INR/kg) for revenue; defaults to the neutral table. */
  priceTable?: [number, number][]
}

export interface HarvestProjection {
  currentDocDay: number
  currentWeightG: number
  harvestDocDay: number
  daysToHarvest: number
  harvestDate: Date
  readyNow: boolean
  estimatedCount: number
  survivalPct: number
  estimatedBiomassKg: number
  countPerKgAtHarvest: number
  /** Feed required from now to harvest (kg). */
  feedKgToHarvest: number
  estimatedFeedCostINR: number
  estimatedRevenueINR: number
  /** Revenue minus projected feed cost (NOT a full P&L). */
  estimatedFeedMarginINR: number
}

/** Project a crop forward to its target harvest size. */
export function projectHarvest(input: HarvestProjectionInput): HarvestProjection {
  const {
    species,
    stockedCount,
    stockedAt,
    asOf,
    targetWeightG,
    dailyMortalityPct = 0.2,
    measuredWeightG,
    feedPricePerKgINR = 90,
    priceTable = DEFAULT_PRICE_BY_COUNT,
  } = input

  const currentDocDay = daysOfCulture(stockedAt, asOf)
  const currentWeightG = measuredWeightG ?? estimateAverageWeightG(species, currentDocDay)

  const harvestDocDay = Math.max(currentDocDay, docDaysForWeight(species, targetWeightG))
  const daysToHarvest = Math.max(0, harvestDocDay - currentDocDay)
  const readyNow = currentWeightG >= targetWeightG || daysToHarvest === 0

  const harvestDate = new Date(asOf.getTime() + daysToHarvest * MS_PER_DAY)
  const estimatedCount = projectedSurvival({
    stockedCount,
    dailyMortalityRatePct: dailyMortalityPct,
    days: harvestDocDay,
  })
  const weightAtHarvest = Math.max(targetWeightG, estimateAverageWeightG(species, harvestDocDay))
  const estimatedBiomassKg = biomass({ averageWeightG: weightAtHarvest, count: estimatedCount })
  const cpk = countPerKg(weightAtHarvest)

  const feedKgToHarvest = projectFeedKg({
    species,
    stockedCount,
    fromDocDay: currentDocDay,
    toDocDay: harvestDocDay,
    dailyMortalityPct,
  })
  const estimatedFeedCostINR = feedKgToHarvest * feedPricePerKgINR
  const estimatedRevenueINR = estimatedBiomassKg * priceForCount(cpk, priceTable)

  return {
    currentDocDay,
    currentWeightG,
    harvestDocDay,
    daysToHarvest,
    harvestDate,
    readyNow,
    estimatedCount,
    survivalPct: survivalRate({ stockedCount, currentCount: estimatedCount }),
    estimatedBiomassKg,
    countPerKgAtHarvest: cpk,
    feedKgToHarvest,
    estimatedFeedCostINR,
    estimatedRevenueINR,
    estimatedFeedMarginINR: estimatedRevenueINR - estimatedFeedCostINR,
  }
}

export default {
  feedRateForWeight,
  docDaysForWeight,
  projectGrowthSeries,
  projectFeedKg,
  projectHarvest,
}
