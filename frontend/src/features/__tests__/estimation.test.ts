import {
  daysOfCulture,
  estimateAverageWeightG,
  countPerKg,
  estimatePond,
  priceForCount,
  estimateCropValue,
  normalizeSpecies,
  estimateFarm,
} from '../estimation'

describe('normalizeSpecies', () => {
  it('maps common names and defaults to vannamei', () => {
    expect(normalizeSpecies('Penaeus monodon')).toBe('monodon')
    expect(normalizeSpecies('Black Tiger')).toBe('monodon')
    expect(normalizeSpecies('P. indicus')).toBe('indicus')
    expect(normalizeSpecies('Litopenaeus vannamei')).toBe('vannamei')
    expect(normalizeSpecies('')).toBe('vannamei')
    expect(normalizeSpecies(undefined)).toBe('vannamei')
  })
})

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d))
}

describe('daysOfCulture', () => {
  it('counts whole days and never goes negative', () => {
    expect(daysOfCulture(utc(2024, 1, 1), utc(2024, 1, 31))).toBe(30)
    expect(daysOfCulture(utc(2024, 1, 31), utc(2024, 1, 1))).toBe(0)
  })
})

describe('estimateAverageWeightG', () => {
  it('returns 0 at stocking and grows monotonically', () => {
    expect(estimateAverageWeightG('vannamei', 0)).toBe(0)
    const w30 = estimateAverageWeightG('vannamei', 30)
    const w60 = estimateAverageWeightG('vannamei', 60)
    const w90 = estimateAverageWeightG('vannamei', 90)
    expect(w30).toBeGreaterThan(0)
    expect(w60).toBeGreaterThan(w30)
    expect(w90).toBeGreaterThan(w60)
  })

  it('interpolates linearly between anchors', () => {
    // Midpoint of the 30g->60g segment (3g -> 9g) should be ~6g.
    expect(estimateAverageWeightG('vannamei', 45)).toBeCloseTo(6, 5)
  })

  it('extrapolates beyond the last anchor without dropping', () => {
    const w150 = estimateAverageWeightG('vannamei', 150)
    const w180 = estimateAverageWeightG('vannamei', 180)
    expect(w180).toBeGreaterThan(w150)
  })

  it('grows monodon faster than indicus at the same age', () => {
    expect(estimateAverageWeightG('monodon', 90)).toBeGreaterThan(
      estimateAverageWeightG('indicus', 90),
    )
  })
})

describe('countPerKg', () => {
  it('inverts grams to count per kg', () => {
    expect(countPerKg(20)).toBeCloseTo(50, 5)
    expect(countPerKg(0)).toBe(0)
  })
})

describe('estimatePond', () => {
  it('estimates biomass, survival and size from stocking data', () => {
    const est = estimatePond({
      species: 'vannamei',
      stockedCount: 100_000,
      stockedAt: utc(2024, 1, 1),
      asOf: utc(2024, 4, 1), // 91 days
      dailyMortalityPct: 0.2,
    })
    expect(est.docDays).toBe(91)
    expect(est.estimatedCount).toBeLessThan(100_000)
    expect(est.estimatedCount).toBeGreaterThan(50_000)
    expect(est.survivalPct).toBeGreaterThan(50)
    expect(est.survivalPct).toBeLessThan(100)
    expect(est.averageWeightG).toBeGreaterThan(15)
    expect(est.biomassKg).toBeGreaterThan(0)
  })

  it('honors measured overrides over the model', () => {
    const est = estimatePond({
      species: 'vannamei',
      stockedCount: 100_000,
      stockedAt: utc(2024, 1, 1),
      asOf: utc(2024, 4, 1),
      measuredAverageWeightG: 20,
      measuredCount: 80_000,
    })
    expect(est.averageWeightG).toBe(20)
    expect(est.estimatedCount).toBe(80_000)
    // biomass = 20g * 80,000 / 1000 = 1600 kg
    expect(est.biomassKg).toBeCloseTo(1600, 5)
    expect(est.survivalPct).toBeCloseTo(80, 5)
  })
})

describe('priceForCount', () => {
  it('charges more for larger shrimp (lower count/kg)', () => {
    expect(priceForCount(20)).toBeGreaterThan(priceForCount(60))
  })

  it('clamps outside the table range', () => {
    expect(priceForCount(10)).toBe(600) // below smallest count -> top price
    expect(priceForCount(500)).toBe(230) // above largest count -> floor price
  })

  it('interpolates within the table', () => {
    // Between count 20 (600) and 30 (480): count 25 -> ~540.
    expect(priceForCount(25)).toBeCloseTo(540, 5)
  })
})

describe('estimateFarm', () => {
  it('aggregates biomass, value and stocked-weighted survival', () => {
    const asOf = utc(2024, 4, 1)
    const farm = estimateFarm(
      [
        { species: 'vannamei', stockedCount: 100_000, stockedAt: '2024-01-01' },
        { species: 'monodon', stockedCount: 50_000, stockedAt: '2024-02-01' },
      ],
      asOf,
    )
    expect(farm.cropCount).toBe(2)
    expect(farm.totalBiomassKg).toBeGreaterThan(0)
    expect(farm.totalValueINR).toBeGreaterThan(0)
    expect(farm.weightedSurvivalPct).toBeGreaterThan(0)
    expect(farm.weightedSurvivalPct).toBeLessThanOrEqual(100)
  })

  it('returns zeros for an empty farm', () => {
    const farm = estimateFarm([], utc(2024, 4, 1))
    expect(farm).toEqual({
      cropCount: 0,
      totalBiomassKg: 0,
      totalValueINR: 0,
      weightedSurvivalPct: 0,
    })
  })
})

describe('estimateCropValue', () => {
  it('multiplies biomass by the size-based price', () => {
    const est = estimatePond({
      species: 'vannamei',
      stockedCount: 100_000,
      stockedAt: utc(2024, 1, 1),
      asOf: utc(2024, 4, 1),
      measuredAverageWeightG: 25, // 40 count/kg -> 400 INR/kg
      measuredCount: 80_000, // biomass = 25*80000/1000 = 2000 kg
    })
    expect(est.countPerKg).toBeCloseTo(40, 5)
    expect(estimateCropValue(est)).toBeCloseTo(2000 * 400, 0)
  })
})
