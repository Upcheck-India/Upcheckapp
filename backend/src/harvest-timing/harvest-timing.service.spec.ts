import {
  HarvestTimingService,
  HarvestTimingInput,
} from './harvest-timing.service';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';
import { CountPriceBand } from '../india/economics.service';

const BANDS: CountPriceBand[] = [
  { count: 30, price: 520 },
  { count: 40, price: 430 },
  { count: 50, price: 360 },
];

const svc = new HarvestTimingService(new ShrimpCalculationsService());

const base: HarvestTimingInput = {
  abwNow: 20,
  adgNow: 1.0,
  adgDecay: 0.97,
  nNow: 80_000,
  dailySurvival: 0.999,
  areaM2: 4000,
  carryingCapacityKgM2: 2.0,
  feedPricePerKg: 30,
  priceBands: BANDS,
  diseaseRisk: 0,
  horizon: 30,
};

describe('HarvestTimingService.optimize (farmer_features_spec §1)', () => {
  it('recommends HOLDING when growth into higher price bands outweighs feed cost', () => {
    const r = svc.optimize({ ...base, adgNow: 1.2, feedPricePerKg: 30 });
    expect(r.optimalDay).toBeGreaterThan(0);
    expect(r.recommendNow).toBe(false);
    expect(r.expectedGain).toBeGreaterThan(0);
    expect(r.netOptimal).toBeGreaterThanOrEqual(r.netNow);
  });

  it('recommends HARVEST NOW when there is no growth and cost/risk only erode value', () => {
    const r = svc.optimize({
      ...base,
      abwNow: 30,
      adgNow: 0, // no growth
      feedPricePerKg: 200,
      diseaseRisk: 0.2,
    });
    expect(r.optimalDay).toBe(0);
    expect(r.recommendNow).toBe(true);
    expect(r.expectedGain).toBe(0);
    // Net profit only declines from here.
    expect(r.projections[5].netProfit).toBeLessThan(r.projections[0].netProfit);
  });

  it('never picks a day that violates the carrying-capacity cap', () => {
    const r = svc.optimize({ ...base, adgNow: 1.2 });
    const chosen = r.projections[r.optimalDay];
    expect(r.optimalDay === 0 || chosen.feasible).toBe(true);
    expect(chosen.biomassKg / base.areaM2).toBeLessThanOrEqual(
      base.carryingCapacityKgM2 + 1e-9,
    );
  });

  it('partial-harvest beats full-now when the pond is over-stocked', () => {
    // 400k @ 25g on 4000 m² = 2.5 kg/m² > cap 2.0 → over-stocked.
    const r = svc.optimize({
      ...base,
      abwNow: 25,
      nNow: 400_000,
      carryingCapacityKgM2: 2.0,
    });
    expect(r.partial).not.toBeNull();
    expect(r.partial!.betterThanFull).toBe(true);
    expect(r.partial!.total).toBeGreaterThan(Math.max(r.netNow, r.netOptimal));
    // The optimum for this case is ~0.5; assert the search explores past the old
    // hard-coded grid cap of 0.4 (would fail on the truncated {0.2,0.3,0.4} grid).
    expect(r.partial!.pct).toBeGreaterThan(0.4);
  });

  it('offers no partial plan when stocking is within carrying capacity', () => {
    const r = svc.optimize({ ...base }); // 0.4 kg/m² ≪ cap
    expect(r.partial).toBeNull();
  });

  it('higher disease risk lowers net profit and pulls the optimal day earlier', () => {
    const calm = svc.optimize({ ...base, adgNow: 1.2, diseaseRisk: 0 });
    const risky = svc.optimize({ ...base, adgNow: 1.2, diseaseRisk: 0.5 });
    expect(risky.netOptimal).toBeLessThan(calm.netOptimal);
    expect(risky.optimalDay).toBeLessThanOrEqual(calm.optimalDay);
  });

  it('slows growth as the pond fills toward carrying capacity (density cap)', () => {
    // Same cohort, same ADG; only the carrying capacity differs. The crowded
    // pond (near capacity) must grow LESS than the roomy one over the horizon.
    const crowded = svc.optimizeCore({
      ...base,
      nNow: 300_000,
      abwNow: 25,
      carryingCapacityKgM2: 2.0,
      horizon: 10,
    });
    const roomy = svc.optimizeCore({
      ...base,
      nNow: 300_000,
      abwNow: 25,
      carryingCapacityKgM2: 20.0,
      horizon: 10,
    });
    expect(crowded.projections[10].abw).toBeLessThan(roomy.projections[10].abw);
  });

  it('treats disease risk as a compounding hold cost (zero now, growing with days)', () => {
    const r = svc.optimizeCore({
      ...base,
      adgNow: 1.2,
      diseaseRisk: 0.5,
      horizon: 30,
    });
    expect(r.projections[0].riskLoss).toBe(0); // harvesting now carries no exposure
    expect(r.projections[10].riskLoss).toBeGreaterThan(0);
    expect(r.projections[30].riskLoss).toBeGreaterThan(
      r.projections[10].riskLoss,
    );
  });
});
