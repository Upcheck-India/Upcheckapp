import { FeedAdvisorService } from './feed-advisor.service';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';

/**
 * Validates the ration engine against farmer_features_spec.md §3 and its
 * "unit tests to add" list (ration→0 on fasting; tray/molt/env factors
 * multiply correctly).
 */
describe('FeedAdvisorService.computeRation', () => {
  // Only the pure engine is exercised; repo/ponds are unused here.
  const svc = new FeedAdvisorService(
    null as any,
    new ShrimpCalculationsService(),
    null as any,
  );

  // Baseline: N=120,000, ABW=25g → biomass 3000kg; FR(25g)=2.5% → base 75kg.
  const base = { livePopulation: 120_000, abwG: 25 };

  it('computes biomass, FR(ABW) and base ration with neutral factors', () => {
    const r = svc.computeRation({ ...base });
    expect(r.biomassKg).toBe(3000);
    expect(r.frPct).toBe(2.5);
    expect(r.baseRationKg).toBe(75);
    expect(r.recommendedKg).toBe(75);
    expect(r.factors).toEqual({ tray: 1, molt: 1, env: 1, fasting: 1 });
    expect(r.perMeal).toEqual([18.75, 18.75, 18.75, 18.75]); // default 4 meals
  });

  it('zeroes the ration on a fasting day', () => {
    const r = svc.computeRation({ ...base, fasting: true });
    expect(r.recommendedKg).toBe(0);
    expect(r.perMeal.every((m) => m === 0)).toBe(true);
  });

  it('applies the tray-residue multiplier', () => {
    expect(svc.computeRation({ ...base, lastTray: 'empty' }).recommendedKg).toBe(80.25); // ×1.07
    expect(svc.computeRation({ ...base, lastTray: 'a_lot_left' }).recommendedKg).toBe(60); // ×0.8
    expect(svc.computeRation({ ...base, lastTray: 'few_left' }).recommendedKg).toBe(75); // ×1.0
  });

  it('cuts feed in a molt-peak window (×0.75)', () => {
    expect(svc.computeRation({ ...base, inMoltPeak: true }).recommendedKg).toBe(56.25);
  });

  it('grades the ammonia cut by free-NH3 level (stress from ~0.1 mg/L)', () => {
    expect(svc.computeRation({ ...base, nh3: 0.05 }).recommendedKg).toBe(75); // below stress → no cut
    expect(svc.computeRation({ ...base, nh3: 0.15 }).recommendedKg).toBe(67.5); // ×0.9 early stress
    expect(svc.computeRation({ ...base, nh3: 0.3 }).recommendedKg).toBe(60); // ×0.8 high
    expect(svc.computeRation({ ...base, nh3: 0.5 }).recommendedKg).toBe(52.5); // ×0.7 toxic
  });

  it('compounds environmental stressors', () => {
    expect(svc.computeRation({ ...base, do: 3.5 }).recommendedKg).toBe(63.75); // ×0.85
    expect(svc.computeRation({ ...base, nh3: 0.4 }).recommendedKg).toBe(60); // ×0.8
    expect(svc.computeRation({ ...base, temp: 34 }).recommendedKg).toBe(67.5); // ×0.9
    // All three multiply: 0.85×0.8×0.9 = 0.612 → 75×0.612 = 45.9
    const r = svc.computeRation({ ...base, do: 3.5, nh3: 0.4, temp: 34 });
    expect(r.recommendedKg).toBe(45.9);
  });

  it('reduces feed in cool / cold water (both ends of the temp curve)', () => {
    expect(svc.computeRation({ ...base, temp: 26 }).recommendedKg).toBe(63.75); // <28 → ×0.85
    expect(svc.computeRation({ ...base, temp: 22 }).recommendedKg).toBe(52.5); // <24 → ×0.70
    expect(svc.computeRation({ ...base, temp: 30 }).recommendedKg).toBe(75); // optimal band → ×1.0
    expect(svc.computeRation({ ...base, temp: 26 }).reasons).toContain('−15% cool water');
    expect(svc.computeRation({ ...base, temp: 22 }).reasons).toContain('−30% cold water');
  });

  it('per-meal amounts always sum back to the recommended ration', () => {
    // Uneven split (50/3) must still conserve the total.
    const r = svc.computeRation({ ...base, fr: 2, mealsPerDay: 3 }); // base 60kg
    expect(r.recommendedKg).toBe(60);
    const sum = r.perMeal.reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 100) / 100).toBe(60);
    // An odd ration (47.81 / 4) also conserves.
    const r2 = svc.computeRation({ ...base, inMoltPeak: true, do: 3.5 });
    const sum2 = r2.perMeal.reduce((a, b) => a + b, 0);
    expect(Math.round(sum2 * 100) / 100).toBe(r2.recommendedKg);
  });

  it('stacks tray × molt × env together', () => {
    // 75 × 0.75(molt) × 0.85(DO) = 47.8125 → 47.81
    const r = svc.computeRation({ ...base, inMoltPeak: true, do: 3.5 });
    expect(r.recommendedKg).toBe(47.81);
    expect(r.reasons).toEqual(['−25% molt window', '−15% low DO']);
  });

  it('honors an FR override', () => {
    expect(svc.computeRation({ ...base, fr: 2 }).baseRationKg).toBe(60); // 3000×2%
  });

  it('picks the species-specific FR table when species is given', () => {
    // At ABW 35g: vannamei tapers to 1.8%, tiger (monodon) holds a higher 2.0%.
    expect(svc.computeRation({ livePopulation: 100_000, abwG: 35 }).frPct).toBe(1.8);
    expect(svc.computeRation({ livePopulation: 100_000, abwG: 35, species: 'Penaeus monodon' }).frPct).toBe(2);
    // Scampi (freshwater prawn) uses a lower juvenile rate than vannamei.
    expect(svc.computeRation({ livePopulation: 100_000, abwG: 2, species: 'scampi' }).frPct).toBe(8);
    expect(svc.computeRation({ livePopulation: 100_000, abwG: 2 }).frPct).toBe(10); // vannamei
  });

  it('computes adherence clamped to [0,1]', () => {
    expect(svc.adherence(60, 75)).toBe(0.8);
    expect(svc.adherence(100, 75)).toBe(1); // clamp
    expect(svc.adherence(0, 75)).toBe(0);
  });
});
