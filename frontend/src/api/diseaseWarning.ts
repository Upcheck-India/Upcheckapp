import apiClient from './client';

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

  recent: (pondId: string) =>
    apiClient.get<DiseaseRiskSnapshot[]>(`/disease-risk/pond/${pondId}`),

  latest: (pondId: string) =>
    apiClient.get<DiseaseRiskSnapshot>(`/disease-risk/pond/${pondId}/latest`),
};
