import apiClient from './client';
import type { CountPriceBand } from './india';

export interface DayProjection {
  day: number;
  abw: number;
  count: number;
  population: number;
  biomassKg: number;
  pricePerKg: number;
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
  id?: string;
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
