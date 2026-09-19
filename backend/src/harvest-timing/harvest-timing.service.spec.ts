import {
  HarvestTimingService,
  HarvestTimingInput,
  safeDays,
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

/* ── H6 ─────────────────────────────────────────────────────────────────── */

describe('H6 — prices interpolate between the farm quote bands', () => {
  it('prices a 42-count between the 40 and 50 bands, not at the nearest', () => {
    // abw 23.81 g → count 42.
    const r = svc.optimize({ ...base, abwNow: 1000 / 42, horizon: 0 });
    expect(r.projections[0].pricePerKg).toBe(416);
    expect(r.projections[0].priceExtrapolated).toBe(false);
  });

  it('flags a count outside the quoted range as extrapolated', () => {
    const r = svc.optimize({ ...base, abwNow: 10, horizon: 0 }); // 100-count
    expect(r.projections[0].pricePerKg).toBe(360);
    expect(r.projections[0].priceExtrapolated).toBe(true);
  });
});

describe('H6 — molt-aware (T5)', () => {
  const now = new Date('2026-09-19T06:00:00Z'); // full moon 26 Sep IST

  it('tags each projection day with its IST date and molt phase', () => {
    const r = svc.optimize({ ...base, now, horizon: 12 });
    const byDate = Object.fromEntries(r.projections.map((p) => [p.date, p.moltPhase]));
    expect(r.projections[0].date).toBe('2026-09-19');
    expect(byDate['2026-09-22']).toBe('inter');
    expect(byDate['2026-09-23']).toBe('pre');
    expect(byDate['2026-09-26']).toBe('peak');
    expect(byDate['2026-09-28']).toBe('post');
    expect(byDate['2026-09-30']).toBe('inter');
  });

  const proj = (day: number, moltPhase: any, netProfit: number, feasible = true) =>
    ({ day, date: `d${day}`, moltPhase, netProfit, feasible }) as any;

  it('an optimal day in peak returns the nearest safe day on each side', () => {
    const projections = [
      proj(0, 'inter', 100),
      proj(1, 'pre', 150),
      proj(2, 'peak', 180),
      proj(3, 'peak', 200),
      proj(4, 'post', 190),
      proj(5, 'inter', 170, false), // over capacity: not harvestable
      proj(6, 'inter', 160),
    ];
    expect(safeDays(projections, 3)).toEqual({
      phase: 'peak',
      before: { day: 1, date: 'd1', netProfit: 150, diff: -50 },
      after: { day: 6, date: 'd6', netProfit: 160, diff: -40 },
    });
  });

  it('is null when the optimal day is not a molt day', () => {
    expect(safeDays([proj(0, 'inter', 1), proj(1, 'pre', 2)], 1)).toBeNull();
  });

  it('reports a missing side as null', () => {
    const r = safeDays([proj(0, 'post', 5), proj(1, 'inter', 4)], 0);
    expect(r).toEqual({
      phase: 'post',
      before: null,
      after: { day: 1, date: 'd1', netProfit: 4, diff: -1 },
    });
  });

  it('optimize wires safeDay from its own projections', () => {
    const r = svc.optimize({ ...base, now, adgNow: 1.2 });
    expect(r.safeDay).toEqual(safeDays(r.projections, r.optimalDay));
  });
});

describe('H6 — partial harvest bias fix (T4)', () => {
  // 100,000 × 20 g = 2,000 kg on 1,000 m² at 1.5 kg/m² → over-stocked.
  // 50-count @ ₹300. Horizon 0: the remainder can only be sold today too.
  const over: HarvestTimingInput = {
    ...base,
    abwNow: 20,
    adgNow: 0,
    nNow: 100_000,
    areaM2: 1000,
    carryingCapacityKgM2: 1.5,
    priceBands: [{ count: 50, price: 300 }],
    horizon: 0,
  };

  it('with disease risk 0, partial at p equals the hand calculation', () => {
    const r = svc.optimize({ ...over, diseaseRisk: 0 });
    const p = r.partial!;
    // realised now = p × 2,000 kg × ₹300; remainder = (1 − p) × the same.
    expect(p.realizedNow).toBeCloseTo(p.pct * 600_000, 2);
    expect(p.remainderNet).toBeCloseTo((1 - p.pct) * 600_000, 2);
    expect(p.total).toBeCloseTo(600_000, 2);
    expect(r.netNow).toBe(600_000);
    // Same money either way: thinning is not "better" than selling all now.
    expect(p.betterThanFull).toBe(false);
  });

  it('day-0 sales carry no disease haircut, however high the risk', () => {
    const r = svc.optimize({ ...over, diseaseRisk: 1 });
    // Old code: realizedNow × (1 − risk) = 0 at risk 1.
    expect(r.partial!.realizedNow).toBeCloseTo(r.partial!.pct * 600_000, 2);
    expect(r.partial!.total).toBeCloseTo(r.netNow, 2);
  });
});
