import { Injectable } from '@nestjs/common';

export interface PartialHarvest {
  /** Day of culture the harvest occurs. */
  age: number;
  /** Fraction of the INITIAL stocking N₀ removed (matches the JALA reference,
   *  where 41% + 20% + 39% of N₀ = 100%). */
  pctOfInitial: number;
}

export interface SimInput {
  areaM2: number;
  n0: number;
  days: number; // D
  maxBiomassKgM2: number;
  targetSrPct: number;
  /** Calibration anchor: harvest size (pieces/kg) at `anchorDay`. */
  sizeAt100d: number;
  feedPrice: number; // ₹/kg
  shrimpPrice: number; // ₹/kg (flat)
  partialHarvestPlan?: PartialHarvest[];
  // ── Model parameters (documented; defaults match the reconstructed curve) ──
  plWeightG?: number; // MBW floor, default 0.01 g
  /** Growth-curve exponent p in MBW(t)=anchor×(t/anchorDay)^p. The JALA
   *  reference run is fit by p≈1.66 (MBW 12/20.35/30.38 g at d69/95/120).
   *  Default 1.66. */
  growthExponent?: number;
  anchorDay?: number; // default 100
}

export interface HarvestEvent {
  age: number;
  population: number;
  mbwG: number;
  count: number;
  biomassKg: number;
  kind: 'planned' | 'carrying_cap' | 'final';
}

export interface DayPoint {
  day: number;
  mbwG: number;
  population: number;
  biomassKg: number;
  frPct: number;
  feedKg: number;
}

export interface SimResult {
  series: DayPoint[];
  harvests: HarvestEvent[];
  totalFeedKg: number;
  totalFeedCost: number;
  totalHarvestBiomassKg: number;
  fcr: number;
  revenue: number;
  profit: number;
  productivityTPerHa: number;
  growthExponent: number;
  mbwAtAnchor: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Day-by-day growth / feed / harvest simulation (jala_teardown.md §12).
 *
 * Growth is a logistic curve calibrated (by bisection on the growth rate) so
 * that MBW(anchorDay) = 1000 / sizeAt100d — the spec's single calibration
 * anchor (§12.2). The feeding-rate table (§12.3) declines with size. Survival
 * decays at the fixed daily rate that lands on targetSR over D days (§12.4).
 *
 * NOTE ON FIDELITY: the original JALA reference run (Total Feed 2,556.73 kg,
 * FCR 1.227) was produced by a proprietary growth curve + fine FR table that
 * the spec only reconstructs. This engine reproduces the *structure* exactly
 * and lands close to those figures; the absolute totals depend on the curve
 * parameters (wMaxG, plWeightG) which are tunable here.
 */
@Injectable()
export class SimEngineService {
  /** Feeding rate %(MBW) — declines as shrimp grow (§12.3). */
  feedingRate(mbwG: number): number {
    if (mbwG < 1) return 10;
    if (mbwG < 3) return 8;
    if (mbwG < 5) return 6;
    if (mbwG < 10) return 4.0;
    if (mbwG < 15) return 3.2;
    if (mbwG < 20) return 2.6;
    if (mbwG < 25) return 2.17; // §12.3 sample: ~25 g → 2.17 %
    if (mbwG < 30) return 2.05; // §12.3 sample: ~28 g → 2.05 %
    return 1.9;
  }

  /**
   * Power-law growth curve (§12.2), anchored so MBW(anchorDay) = anchorMbw:
   *   MBW(t) = anchorMbw × (t / anchorDay)^p
   * p≈1.66 reproduces the reference points; the anchor fixes the coefficient.
   */
  mbwAt(
    day: number,
    anchorMbw: number,
    anchorDay: number,
    p: number,
    mbw0: number,
  ): number {
    return Math.max(mbw0, anchorMbw * Math.pow(day / anchorDay, p));
  }

  run(input: SimInput): SimResult {
    const mbw0 = input.plWeightG ?? 0.01;
    const p = input.growthExponent ?? 1.66;
    const anchorDay = input.anchorDay ?? 100;
    const anchorMbw = 1000 / input.sizeAt100d;

    const dailySurvival = Math.pow(
      Math.max(0.0001, input.targetSrPct / 100),
      1 / input.days,
    );
    const plan = input.partialHarvestPlan ?? [];

    let N = input.n0;
    let mbw = mbw0;
    let cumFeed = 0;
    const series: DayPoint[] = [];
    const harvests: HarvestEvent[] = [];

    for (let t = 1; t <= input.days; t++) {
      mbw = this.mbwAt(t, anchorMbw, anchorDay, p, mbw0);
      N *= dailySurvival;

      // Planned partial harvests (fraction of initial N₀).
      for (const p of plan.filter((x) => x.age === t)) {
        const removed = Math.min(input.n0 * p.pctOfInitial, N);
        if (removed > 0) {
          N -= removed;
          harvests.push({
            age: t,
            population: Math.round(removed),
            mbwG: round2(mbw),
            count: round2(1000 / mbw),
            biomassKg: round2((removed * mbw) / 1000),
            kind: 'planned',
          });
        }
      }

      // Carrying-capacity forced thinning.
      let biomass = (N * mbw) / 1000;
      if (input.areaM2 > 0 && biomass / input.areaM2 > input.maxBiomassKgM2) {
        const targetN = (input.maxBiomassKgM2 * input.areaM2 * 1000) / mbw;
        const removed = N - targetN;
        if (removed > 0) {
          N = targetN;
          harvests.push({
            age: t,
            population: Math.round(removed),
            mbwG: round2(mbw),
            count: round2(1000 / mbw),
            biomassKg: round2((removed * mbw) / 1000),
            kind: 'carrying_cap',
          });
          biomass = (N * mbw) / 1000;
        }
      }

      const frPct = this.feedingRate(mbw);
      const feedKg = (biomass * frPct) / 100;
      cumFeed += feedKg;

      series.push({
        day: t,
        mbwG: round2(mbw),
        population: Math.round(N),
        biomassKg: round2(biomass),
        frPct,
        feedKg: round2(feedKg),
      });
    }

    // Final harvest of whatever remains.
    if (N > 1) {
      harvests.push({
        age: input.days,
        population: Math.round(N),
        mbwG: round2(mbw),
        count: round2(1000 / mbw),
        biomassKg: round2((N * mbw) / 1000),
        kind: 'final',
      });
    }

    const totalFeedKg = round2(cumFeed);
    const totalHarvestBiomassKg = round2(
      harvests.reduce((a, h) => a + h.biomassKg, 0),
    );
    const fcr =
      totalHarvestBiomassKg > 0
        ? round2(totalFeedKg / totalHarvestBiomassKg)
        : 0;
    const revenue = round2(totalHarvestBiomassKg * input.shrimpPrice);
    const totalFeedCost = round2(totalFeedKg * input.feedPrice);
    const profit = round2(revenue - totalFeedCost);
    const productivityTPerHa =
      input.areaM2 > 0 ? round2((totalHarvestBiomassKg / input.areaM2) * 10) : 0;

    return {
      series,
      harvests,
      totalFeedKg,
      totalFeedCost,
      totalHarvestBiomassKg,
      fcr,
      revenue,
      profit,
      productivityTPerHa,
      growthExponent: p,
      mbwAtAnchor: round2(this.mbwAt(anchorDay, anchorMbw, anchorDay, p, mbw0)),
    };
  }
}
