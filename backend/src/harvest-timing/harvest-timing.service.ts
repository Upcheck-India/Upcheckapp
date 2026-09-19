import { Injectable } from '@nestjs/common';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';
import { CountPriceBand } from '../india/economics.service';
import { interpolatePrice } from '../india/pricing.service';
import {
  MoltPhase,
  addDays,
  phaseOn,
  upcomingWindows,
} from '../molt/molt-window';
import { toIstDateString } from '../common/ist-date';

export interface HarvestTimingInput {
  abwNow: number; // g
  adgNow: number; // g/day
  /**
   * Multiplicative ADG decay per day (<1 decelerates growth). Default 0.97.
   *
   * PROVENANCE (E4): industry rule of thumb, UNCALIBRATED. It encodes the
   * observation that growth slows as shrimp approach market size, not a rate
   * measured on these farms. Tunable per request; nothing tunes it yet.
   */
  adgDecay?: number;
  nNow: number; // live population
  dailySurvival: number; // e.g. 0.999
  areaM2: number;
  carryingCapacityKgM2: number;
  feedPricePerKg: number;
  priceBands: CountPriceBand[];
  /** Cumulative disease risk 0..1 (from Disease Early-Warning). Default 0. */
  diseaseRisk?: number;
  /** Cultured species (free text); selects the FR table for feed-cost. */
  species?: string;
  horizon?: number; // days, default 30
  /** Day 0's instant (tests); molt phases are tagged from its IST date. */
  now?: Date;
}

export interface DayProjection {
  day: number;
  /** IST calendar date of this projection day. */
  date: string;
  /** Molt phase of that date (H6.5). */
  moltPhase: MoltPhase;
  abw: number;
  count: number;
  population: number;
  biomassKg: number;
  pricePerKg: number;
  /** The count is outside the quoted bands; the end band's price is used. */
  priceExtrapolated: boolean;
  gross: number;
  feedCostCum: number;
  riskLoss: number;
  netProfit: number;
  feasible: boolean; // biomass/area ≤ carrying capacity
}

export interface HarvestTimingResult {
  projections: DayProjection[];
  optimalDay: number;
  recommendNow: boolean;
  netNow: number;
  netOptimal: number;
  expectedGain: number;
  partial: PartialPlan | null;
  /**
   * Set when optimalDay falls in a molt peak/post: the nearest harvestable
   * non-molt day on each side (H6.5). No soft-shell discount is modelled —
   * we have no data for it; the advice is to avoid those days instead.
   */
  safeDay: SafeDays | null;
}

export interface SafeDayOption {
  day: number;
  date: string;
  netProfit: number;
  /** netProfit − netOptimal (≤ 0). */
  diff: number;
}

export interface SafeDays {
  phase: MoltPhase;
  before: SafeDayOption | null;
  after: SafeDayOption | null;
}

/** Peak and post are soft-shell days: buyer deductions and rejections. */
const isMoltDay = (p: MoltPhase) => p === 'peak' || p === 'post';

/** IST date + molt phase for day 0..horizon from `now`. */
export function moltCalendar(
  now: Date,
  horizon: number,
): { date: string; phase: MoltPhase }[] {
  const today = toIstDateString(now);
  const windows = upcomingWindows(now, Math.ceil(horizon / 14) + 2);
  const out: { date: string; phase: MoltPhase }[] = [];
  for (let d = 0; d <= horizon; d++) {
    const date = addDays(today, d);
    const phase =
      windows.map((w) => phaseOn(w, date)).find((ph) => ph !== 'inter') ??
      'inter';
    out.push({ date, phase });
  }
  return out;
}

/**
 * If the optimal day is a molt peak/post day, the nearest harvestable day
 * (day 0 or feasible) that is not, on each side. Null when optimal is safe.
 */
export function safeDays(
  projections: DayProjection[],
  optimalDay: number,
): SafeDays | null {
  const opt = projections[optimalDay];
  if (!opt || !isMoltDay(opt.moltPhase)) return null;
  const ok = (p: DayProjection) =>
    (p.day === 0 || p.feasible) && !isMoltDay(p.moltPhase);
  const pick = (p: DayProjection | undefined): SafeDayOption | null =>
    p
      ? {
          day: p.day,
          date: p.date,
          netProfit: p.netProfit,
          diff: round2(p.netProfit - opt.netProfit),
        }
      : null;
  const before = [...projections]
    .reverse()
    .find((p) => p.day < optimalDay && ok(p));
  const after = projections.find((p) => p.day > optimalDay && ok(p));
  return { phase: opt.moltPhase, before: pick(before), after: pick(after) };
}

export interface PartialPlan {
  pct: number; // fraction harvested now
  realizedNow: number; // net value of the portion harvested now
  remainderNet: number; // best net of the remaining cohort
  total: number; // realizedNow + remainderNet
  betterThanFull: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Tunable calibration constants (public-norm defaults; validate locally) ──

// Density-dependent growth: shrimp grow at full ADG until DENSITY_TAPER_START of
// carrying capacity, then slow toward a residual floor as the pond fills
// (competition for oxygen / food / space). Replaces the old "grow at full speed
// then hit a wall" behaviour so "hold longer" advice isn't over-optimistic.
const DENSITY_TAPER_START = 0.8; // fraction of carrying capacity where slowdown begins
const DENSITY_GROWTH_FLOOR = 0.2; // residual growth multiplier at/over capacity

// Disease risk as a COMPOUNDING per-day hazard, not a flat haircut: a held pond
// accumulates exposure, so longer holds are penalised more (and harvesting now
// carries none). A max-risk (1.0) pond loses ~RISK_DAILY_HAZARD_AT_MAX of value
// per held day. `risk` (0..1) comes from the Disease Early-Warning engine.
const RISK_DAILY_HAZARD_AT_MAX = 0.02;

/** Growth multiplier (1 → floor) as biomass density approaches carrying capacity. */
function densityGrowthFactor(densityRatio: number): number {
  if (densityRatio <= DENSITY_TAPER_START) return 1;
  const t = Math.min(
    1,
    (densityRatio - DENSITY_TAPER_START) / (1 - DENSITY_TAPER_START),
  );
  return 1 - (1 - DENSITY_GROWTH_FLOOR) * t;
}

@Injectable()
export class HarvestTimingService {
  constructor(private readonly calc: ShrimpCalculationsService) {}


  /**
   * Full optimization: day-by-day projection + optimal-day search + the
   * partial-harvest comparison. The partial optimizer reuses {@link optimizeCore}
   * (not this method) so there is no recursion.
   */
  optimize(input: HarvestTimingInput): HarvestTimingResult {
    const calendar = moltCalendar(input.now ?? new Date(), input.horizon ?? 30);
    const core = this.optimizeCore(input, calendar);
    return {
      ...core,
      partial: this.partialOptimizer(input, core.netNow, core.netOptimal, calendar),
      safeDay: safeDays(core.projections, core.optimalDay),
    };
  }

  /**
   * Day-by-day projection and optimal-day search (farmer_features_spec.md §1):
   *   netProfit(d) = gross(d) − feedCost(0..d) − riskLoss(d)
   *   d* = argmax netProfit(d)  s.t. biomass(d)/area ≤ carryingCapacity
   * Day 0 (harvest now) is always a candidate.
   */
  optimizeCore(
    input: HarvestTimingInput,
    calendar = moltCalendar(input.now ?? new Date(), input.horizon ?? 30),
  ): Omit<HarvestTimingResult, 'partial' | 'safeDay'> {
    const horizon = input.horizon ?? 30;
    const decay = input.adgDecay ?? 0.97;
    const risk = Math.max(0, Math.min(1, input.diseaseRisk ?? 0));

    const projections: DayProjection[] = [];
    let abw = input.abwNow;
    let feedCostCum = 0;

    for (let d = 0; d <= horizon; d++) {
      if (d > 0) {
        // Density at the end of the previous day governs today's growth: as the
        // pond approaches carrying capacity, growth decelerates (density stress).
        const prevPop = input.nNow * Math.pow(input.dailySurvival, d - 1);
        const prevBiomassKg = (prevPop * abw) / 1000;
        const densityRatio =
          input.areaM2 > 0 && input.carryingCapacityKgM2 > 0
            ? prevBiomassKg / input.areaM2 / input.carryingCapacityKgM2
            : 0;
        const adg =
          input.adgNow *
          Math.pow(decay, d - 1) *
          densityGrowthFactor(densityRatio);
        abw += adg;
      }
      const population = input.nNow * Math.pow(input.dailySurvival, d);
      const biomassKg = (population * abw) / 1000;
      const count = abw > 0 ? 1000 / abw : 0;
      const quoted = interpolatePrice(input.priceBands, count);
      const pricePerKg = quoted?.price ?? 0;
      const gross = biomassKg * pricePerKg;

      if (d > 0) {
        const frPct = this.calc.getRecommendedFeedingRate(abw, input.species);
        const ration = (biomassKg * frPct) / 100; // kg/day
        feedCostCum += ration * input.feedPricePerKg;
      }
      // Compounding disease exposure over the hold: 0 at harvest-now, growing the
      // longer the cohort is held. survivors = (1 − dailyHazard)^d.
      const diseaseValueLost =
        1 - Math.pow(1 - risk * RISK_DAILY_HAZARD_AT_MAX, d);
      const riskLoss = gross * diseaseValueLost;
      const netProfit = gross - feedCostCum - riskLoss;
      const feasible =
        input.areaM2 > 0 &&
        biomassKg / input.areaM2 <= input.carryingCapacityKgM2;

      projections.push({
        day: d,
        date: calendar[d].date,
        moltPhase: calendar[d].phase,
        abw: round2(abw),
        count: round2(count),
        population: Math.round(population),
        biomassKg: round2(biomassKg),
        pricePerKg: round2(pricePerKg),
        priceExtrapolated: quoted?.extrapolated ?? false,
        gross: round2(gross),
        feedCostCum: round2(feedCostCum),
        riskLoss: round2(riskLoss),
        netProfit: round2(netProfit),
        feasible,
      });
    }

    // d* over candidate days: day 0 (always harvestable) + feasible future days.
    let optimalDay = 0;
    let netOptimal = projections[0].netProfit;
    for (const p of projections) {
      if (p.day === 0 || p.feasible) {
        if (p.netProfit > netOptimal) {
          netOptimal = p.netProfit;
          optimalDay = p.day;
        }
      }
    }
    const netNow = projections[0].netProfit;
    const expectedGain = round2(netOptimal - netNow);

    return {
      projections,
      optimalDay,
      recommendNow: optimalDay === 0,
      netNow,
      netOptimal,
      expectedGain,
    };
  }

  /**
   * Partial-harvest optimizer (§1): when over carrying capacity (or growth
   * stalling), thinning p% now relieves density so survivors grow into a
   * higher-value band. Compares realize-now-portion + best-of-remainder against
   * harvesting the full cohort now.
   */
  private partialOptimizer(
    input: HarvestTimingInput,
    netNow: number,
    netOptimal: number,
    calendar: { date: string; phase: MoltPhase }[],
  ): PartialPlan | null {
    const day0Biomass = (input.nNow * input.abwNow) / 1000;
    const overStocked =
      input.areaM2 > 0 &&
      day0Biomass / input.areaM2 > input.carryingCapacityKgM2;
    if (!overStocked) return null;

    const countNow = input.abwNow > 0 ? 1000 / input.abwNow : 0;
    const priceNow = interpolatePrice(input.priceBands, countNow)?.price ?? 0;

    // Sweep the full thinning range (10%–90%) at fine resolution so the search
    // can't stop while net profit is still rising — the old {0.2,0.3,0.4} grid
    // truncated below the true optimum and systematically under-harvested.
    const fractions: number[] = [];
    for (let p = 0.1; p <= 0.9 + 1e-9; p += 0.05) {
      fractions.push(Math.round(p * 100) / 100);
    }

    let best: PartialPlan | null = null;
    for (const pct of fractions) {
      // T4: the portion sold TODAY carries no disease haircut — the same basis
      // as "harvest all today" (riskLoss is 0 on day 0). Haircutting it biased
      // every comparison against thinning.
      const realizedNow =
        ((pct * input.nNow * input.abwNow) / 1000) * priceNow;
      // Remaining cohort grows under the same conditions (lower density now).
      // Use optimizeCore to avoid re-entering the partial optimizer.
      const remainder = this.optimizeCore(
        { ...input, nNow: (1 - pct) * input.nNow },
        calendar,
      );
      const total = realizedNow + remainder.netOptimal;
      if (!best || total > best.total) {
        best = {
          pct,
          realizedNow: round2(realizedNow),
          remainderNet: round2(remainder.netOptimal),
          total: round2(total),
          betterThanFull: total > Math.max(netNow, netOptimal),
        };
      }
    }
    return best;
  }
}
