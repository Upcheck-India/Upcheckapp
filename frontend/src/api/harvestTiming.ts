import apiClient from './client';
import type { CountPriceBand } from './india';

export type MoltPhase = 'pre' | 'peak' | 'post' | 'inter';

export interface DayProjection {
  day: number;
  /** IST date (H6; absent on an older backend). */
  date?: string;
  moltPhase?: MoltPhase;
  abw: number;
  count: number;
  population: number;
  biomassKg: number;
  pricePerKg: number;
  /** Count outside the quoted bands; the end band's price is used. */
  priceExtrapolated?: boolean;
  gross: number;
  feedCostCum: number;
  riskLoss: number;
  netProfit: number;
  feasible: boolean;
}

export interface PartialPlan {
  pct: number;
  realizedNow: number;
  remainderNet: number;
  total: number;
  betterThanFull: boolean;
}

export interface HarvestTimingResult {
  projections: DayProjection[];
  optimalDay: number;
  recommendNow: boolean;
  netNow: number;
  netOptimal: number;
  expectedGain: number;
  partial: PartialPlan | null;
  /** Optimal day is a molt peak/post day: the nearest safe day each side. */
  safeDay?: SafeDays | null;
  id?: string;
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

export interface OptimizeInput {
  abwNow: number;
  adgNow: number;
  adgDecay?: number;
  nNow: number;
  dailySurvival?: number;
  areaM2: number;
  carryingCapacityKgM2?: number;
  feedPricePerKg: number;
  priceBands?: CountPriceBand[];
  region?: string;
  diseaseRisk?: number;
  horizon?: number;
  pondId?: string;
  cropId?: string;
  persist?: boolean;
}

export const harvestTimingApi = {
  /** Compute the projection + harvest verdict (optionally persist). */
  optimize: (input: OptimizeInput) =>
    apiClient.post<HarvestTimingResult>('/harvest-timing/optimize', input),

  recent: (pondId: string) =>
    apiClient.get<HarvestTimingResult[]>(`/harvest-timing/pond/${pondId}`),
};
