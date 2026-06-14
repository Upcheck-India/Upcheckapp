import apiClient from './client';

export interface AerationAdequacy {
  requiredHp: number;
  installedHp: number;
  deficitHp: number;
  adequacyRatio: number;
  underAerated: boolean;
}

export interface NightDoInput {
  currentDo: number;
  biomassKg: number;
  areaM2: number;
  installedHp: number;
  runHours: number;
  planktonLoad?: number;
  temp?: number;
  nightHours?: number;
  doTarget?: number;
}

export const aerationApi = {
  adequacy: (biomassKg: number, installedHp: number) =>
    apiClient.post<AerationAdequacy>('/aeration/adequacy', { biomassKg, installedHp }),

  nightDo: (input: NightDoInput) =>
    apiClient.post<{ predicted: number; recommendedRunHours: number }>(
      '/aeration/night-do',
      input,
    ),

  powerCost: (input: {
    mode: 'grid' | 'diesel';
    totalHp?: number;
    ratePerKwh?: number;
    litresPerHour?: number;
    ratePerLitre?: number;
    runHours: number;
    harvestBiomassKg?: number;
  }) =>
    apiClient.post<{ cost: number; costPerKg: number | null }>(
      '/aeration/power-cost',
      input,
    ),
};
