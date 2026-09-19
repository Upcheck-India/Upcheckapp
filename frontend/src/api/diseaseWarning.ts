import apiClient from './client';
import type { TextKey } from './alertCenter';

export type DiseaseName =
  | 'WSSV'
  | 'AHPND'
  | 'EHP'
  | 'WFD'
  | 'Luminous'
  | 'RMS'
  | 'LSS';

export interface DiseaseIndicators {
  tempDrop3in48h?: boolean;
  doBelow4?: boolean;
  seasonWinter?: boolean;
  regionalWssv?: boolean;
  redBody?: boolean;
  entryRisk?: boolean;
  docBelow35?: boolean;
  yellowVibrioUp?: boolean;
  emptyGut?: boolean;
  paleHp?: boolean;
  sizeCvUp?: boolean;
  adgBelowExpected?: boolean;
  whiteFecesTray?: boolean;
  regionWfd?: boolean;
  vibrioUp?: boolean;
  ehpRiskUp?: boolean;
  luminousVibrioUp?: boolean;
  nightGlow?: boolean;
  chronicDailyMortality?: boolean;
  multiStress?: boolean;
  looseShellObs?: boolean;
  mineralDeficit?: boolean;
  hpStress?: boolean;
}

export interface DiseaseRisk {
  disease: DiseaseName;
  score: number;
  band: 'Low' | 'Watch' | 'Critical';
  triggers: string[];
  steps: string[];
  /** D7; absent on an older backend. */
  coverage?: { known: number; total: number };
  triggerKeys?: TextKey[];
  stepKeys?: TextKey[];
}

/** GET /disease-risk/pond/:id/current — derived from the pond's logs (D7). */
export interface CurrentDiseaseRisk {
  pondId: string;
  cropId: string | null;
  date: string;
  risks: DiseaseRisk[];
  /** Over every indicator: "based on 9 of 23 signs". */
  coverage: { known: number; total: number };
}

export interface DiseaseRiskSnapshot {
  id: string;
  pondId: string;
  cropId: string | null;
  date: string;
  risks: DiseaseRisk[];
  createdAt: string;
}

export const diseaseWarningApi = {
  /** Pure scoring preview from an indicator set. */
  compute: (indicators: DiseaseIndicators) =>
    apiClient.post<DiseaseRisk[]>('/disease-risk/compute', indicators),

  /** Persist a ranked snapshot for a pond. */
  snapshot: (body: {
    pondId: string;
    cropId?: string;
    date: string;
    indicators: DiseaseIndicators;
  }) => apiClient.post<DiseaseRiskSnapshot>('/disease-risk', body),

  /** Derived now from the pond's logs; the server also saves the day's snapshot. */
  current: (pondId: string) =>
    apiClient.get<CurrentDiseaseRisk>(`/disease-risk/pond/${pondId}/current`),

  recent: (pondId: string) =>
    apiClient.get<DiseaseRiskSnapshot[]>(`/disease-risk/pond/${pondId}`),

  latest: (pondId: string) =>
    apiClient.get<DiseaseRiskSnapshot>(`/disease-risk/pond/${pondId}/latest`),
};
