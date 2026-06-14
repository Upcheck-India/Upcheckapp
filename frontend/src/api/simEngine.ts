import apiClient from './client';

export interface PartialHarvest {
  age: number;
  pctOfInitial: number;
}

export interface SimInput {
  areaM2: number;
  n0: number;
  days: number;
  maxBiomassKgM2: number;
  targetSrPct: number;
  sizeAt100d: number;
  feedPrice: number;
  shrimpPrice: number;
  partialHarvestPlan?: PartialHarvest[];
  plWeightG?: number;
  growthExponent?: number;
  anchorDay?: number;
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

export const simEngineApi = {
  run: (input: SimInput) => apiClient.post<SimResult>('/sim-engine/run', input),
};
