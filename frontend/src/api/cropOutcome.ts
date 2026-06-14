import apiClient from './client';

export interface OutcomeInputs {
  finalSrPct?: number;
  finalFcr?: number;
  finalCount?: number;
  totalYieldKg?: number;
  areaM2?: number;
  adgMean?: number;
  cultivationDays?: number;
  diseaseOccurred?: string[];
  diseaseOnsetDoc?: number;
  diseaseConfirmedBy?: string;
  emergencyHarvest?: boolean;
  crash?: boolean;
  revenue?: number;
  totalCost?: number;
  modulesCovered?: number;
  modulesTotal?: number;
  loggedDays?: number;
}

export interface CropOutcome {
  id: string;
  cropId: string;
  userId: string;
  finalSrPct: number | null;
  finalFcr: number | null;
  finalCount: number | null;
  totalYieldKg: number | null;
  productivityTPerHa: number | null;
  adgMean: number | null;
  cultivationDays: number | null;
  diseaseOccurred: string[] | null;
  diseaseOnsetDoc: number | null;
  diseaseConfirmedBy: string | null;
  emergencyHarvest: boolean;
  crash: boolean;
  revenue: number | null;
  totalCost: number | null;
  profit: number | null;
  copPerKg: number | null;
  marginPct: number | null;
  roiPct: number | null;
  outcomeClass: 'success' | 'partial' | 'failure';
  dataCompletenessScore: number | null;
  frozenAt: string;
}

export const cropOutcomeApi = {
  preview: (inputs: OutcomeInputs) =>
    apiClient.post<Omit<CropOutcome, 'id' | 'cropId' | 'userId' | 'frozenAt'>>(
      '/crop-outcome/preview',
      inputs,
    ),
  freeze: (cropId: string, inputs: OutcomeInputs) =>
    apiClient.post<CropOutcome>('/crop-outcome/freeze', { cropId, inputs }),
  get: (cropId: string) => apiClient.get<CropOutcome>(`/crop-outcome/crop/${cropId}`),
};
