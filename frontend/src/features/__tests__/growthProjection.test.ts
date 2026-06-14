import {
  feedRateForWeight,
  docDaysForWeight,
  projectGrowthSeries,
  projectFeedKg,
  projectHarvest,
} from '../growthProjection'

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d))
}

describe('feedRateForWeight', () => {
  it('declines as shrimp grow', () => {
    expect(feedRateForWeight(1)).toBeGreaterThan(feedRateForWeight(10))
    expect(feedRateForWeight(10)).toBeGreaterThan(feedRateForWeight(25))
  })
  it('clamps at the ends', () => {
    expect(feedRateForWeight(0)).toBe(12)
    expect(feedRateForWeight(100)).toBe(1.9)
  })
  it('interpolates between anchors', () => {
    // midpoint of 1g(8%)–3g(6%) at 2g ≈ 7%
    expect(feedRateForWeight(2)).toBeCloseTo(7, 5)
  })
  it('uses a species-specific curve (tiger tapers higher at large size, scampi lower at clamp)', () => {
    // At 30g: vannamei 1.9% vs tiger (monodon) 2.1% — tiger eats a touch more at size.
    expect(feedRateForWeight(30, 'vannamei')).toBeCloseTo(1.9, 5)
    expect(feedRateForWeight(30, 'monodon')).toBeCloseTo(2.1, 5)
    // Scampi clamps at 2.4% beyond 30g vs vannamei 1.9%.
    expect(feedRateForWeight(100, 'scampi')).toBe(2.4)
    expect(feedRateForWeight(100, 'vannamei')).toBe(1.9)
  })
})

describe('docDaysForWeight', () => {
  it('returns the first DOC reaching the target size, monotonic in target', () => {
    const d20 = docDaysForWeight('vannamei', 20)
    const d24 = docDaysForWeight('vannamei', 24)
    expect(d20).toBeGreaterThan(0)
    expect(d24).toBeGreaterThanOrEqual(d20)
  })
})

describe('projectGrowthSeries', () => {
  it('produces increasing weight and decreasing count over time', () => {
    const pts = projectGrowthSeries({
      species: 'vannamei',
      stockedCount: 100_000,
      fromDocDay: 30,
      toDocDay: 90,
    })
    expect(pts.length).toBeGreaterThan(1)
    expect(pts[pts.length - 1].weightG).toBeGreaterThan(pts[0].weightG)
    expect(pts[pts.length - 1].count).toBeLessThan(pts[0].count)
    expect(pts[pts.length - 1].docDay).toBe(90)
  })
})

describe('projectFeedKg', () => {
  it('is positive and grows with a longer horizon', () => {
    const base = { species: 'vannamei' as const, stockedCount: 100_000, fromDocDay: 30 }
    const short = projectFeedKg({ ...base, toDocDay: 60 })
    const long = projectFeedKg({ ...base, toDocDay: 100 })
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(short)
  })
})

describe('projectHarvest', () => {
  it('projects a future harvest date, biomass, feed and margin', () => {
    const proj = projectHarvest({
      species: 'vannamei',
      stockedCount: 100_000,
      stockedAt: utc(2024, 1, 1),
      asOf: utc(2024, 3, 1), // ~60 DOC
      targetWeightG: 24,
      dailyMortalityPct: 0.2,
      feedPricePerKgINR: 90,
    })
    expect(proj.currentDocDay).toBe(60)
    expect(proj.harvestDocDay).toBeGreaterThan(proj.currentDocDay)
    expect(proj.daysToHarvest).toBeGreaterThan(0)
    expect(proj.harvestDate.getTime()).toBeGreaterThan(utc(2024, 3, 1).getTime())
    expect(proj.readyNow).toBe(false)
    expect(proj.estimatedBiomassKg).toBeGreaterThan(0)
    expect(proj.feedKgToHarvest).toBeGreaterThan(0)
    expect(proj.estimatedFeedCostINR).toBeCloseTo(proj.feedKgToHarvest * 90, 5)
    expect(proj.estimatedFeedMarginINR).toBeCloseTo(
      proj.estimatedRevenueINR - proj.estimatedFeedCostINR,
      5,
    )
  })

  it('flags readyNow when the measured weight already meets the target', () => {
    const proj = projectHarvest({
      species: 'vannamei',
      stockedCount: 80_000,
      stockedAt: utc(2024, 1, 1),
      asOf: utc(2024, 5, 1),
      targetWeightG: 20,
      measuredWeightG: 25,
    })
    expect(proj.readyNow).toBe(true)
    expect(proj.daysToHarvest).toBe(0)
  })
})
