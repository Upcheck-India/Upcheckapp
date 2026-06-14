import { SimEngineService } from './sim-engine.service';

const svc = new SimEngineService();

const REFERENCE_INPUT = {
  areaM2: 1000,
  n0: 100000,
  days: 120,
  maxBiomassKgM2: 1.2,
  targetSrPct: 100,
  sizeAt100d: 45,
  feedPrice: 15000,
  shrimpPrice: 50000,
  partialHarvestPlan: [
    { age: 69, pctOfInitial: 0.41 },
    { age: 95, pctOfInitial: 0.2 },
    { age: 120, pctOfInitial: 0.39 },
  ],
};

describe('SimEngineService — internal-consistency invariants (jala §12)', () => {
  const r = svc.run(REFERENCE_INPUT);

  it('total feed equals the sum of daily feed', () => {
    const sum = r.series.reduce((a, d) => a + d.feedKg, 0);
    expect(r.totalFeedKg).toBeCloseTo(sum, 0);
  });

  it('FCR = total feed / total harvested biomass', () => {
    expect(r.fcr).toBeCloseTo(r.totalFeedKg / r.totalHarvestBiomassKg, 2);
  });

  it('each harvest biomass = population × MBW / 1000 and count = 1000 / MBW', () => {
    for (const h of r.harvests) {
      expect(h.biomassKg).toBeCloseTo((h.population * h.mbwG) / 1000, 0);
      expect(h.count).toBeCloseTo(1000 / h.mbwG, 1);
    }
  });

  it('daily biomass = population × MBW / 1000', () => {
    // Stored biomass uses full precision; reconstructing from the rounded
    // population/MBW display values allows ~1 kg of rounding slack.
    for (const d of r.series) {
      expect(Math.abs(d.biomassKg - (d.population * d.mbwG) / 1000)).toBeLessThanOrEqual(1);
    }
  });

  it('total harvested population equals N₀ at 100% survival with a full plan', () => {
    const totalPop = r.harvests.reduce((a, h) => a + h.population, 0);
    expect(totalPop).toBeCloseTo(REFERENCE_INPUT.n0, -2); // within ~100
  });

  it('MBW is monotonic increasing and hits the calibration anchor', () => {
    for (let i = 1; i < r.series.length; i++) {
      expect(r.series[i].mbwG).toBeGreaterThanOrEqual(r.series[i - 1].mbwG);
    }
    expect(r.mbwAtAnchor).toBeCloseTo(1000 / REFERENCE_INPUT.sizeAt100d, 1); // 22.22
  });

  it('economics: revenue = harvest biomass × price; profit = revenue − feed cost', () => {
    expect(r.revenue).toBeCloseTo(r.totalHarvestBiomassKg * 50000, 0);
    expect(r.profit).toBeCloseTo(r.revenue - r.totalFeedKg * 15000, 0);
  });
});

describe('SimEngineService — JALA reference run reproduction (jala §12.6)', () => {
  // The reference PDF reports: Total Feed 2,556.73 kg, FCR 1.227, total
  // harvested biomass 2,084 kg, harvests 492/407/1185 kg at d69/95/120.
  // The power-law growth (p=1.66) + §12.3-aligned FR table reproduce these
  // within ~1% (residual = FR-table granularity, only sampled in the spec).
  const r = svc.run(REFERENCE_INPUT);
  const planned = r.harvests.filter((h) => h.kind === 'planned');

  it('reproduces the growth trajectory (MBW at d69/95/120)', () => {
    expect(r.series[68].mbwG).toBeCloseTo(12, 0); // ref 12.0
    expect(r.series[94].mbwG).toBeCloseTo(20.35, 0); // ref 20.35
    expect(r.series[119].mbwG).toBeCloseTo(30.38, 0); // ref 30.38
  });

  it('reproduces the three planned harvest biomasses', () => {
    expect(planned[0].biomassKg).toBeCloseTo(492, -1); // ref 492
    expect(planned[1].biomassKg).toBeCloseTo(407, -1); // ref 407
    expect(planned[2].biomassKg).toBeCloseTo(1185, -2); // ref 1185 (±~50)
  });

  it('reproduces total feed, FCR and productivity within ~3%', () => {
    expect(r.totalHarvestBiomassKg).toBeGreaterThan(2084 * 0.97);
    expect(r.totalHarvestBiomassKg).toBeLessThan(2084 * 1.03);
    expect(r.totalFeedKg).toBeGreaterThan(2556.73 * 0.97);
    expect(r.totalFeedKg).toBeLessThan(2556.73 * 1.03);
    expect(r.fcr).toBeGreaterThan(1.2);
    expect(r.fcr).toBeLessThan(1.27);
    expect(r.productivityTPerHa).toBeCloseTo(20.84, 0);
  });
});

describe('SimEngineService — survival sensitivity', () => {
  it('lower target SR reduces final harvested biomass', () => {
    const full = svc.run(REFERENCE_INPUT);
    const low = svc.run({ ...REFERENCE_INPUT, targetSrPct: 60 });
    expect(low.totalHarvestBiomassKg).toBeLessThan(full.totalHarvestBiomassKg);
  });
});
