import apiClient from './client';

export type FarmType = 'coastal_brackish' | 'inland_low_saline';

export interface PrepTask {
  key: string;
  label: string;
  critical: boolean;
  hasDose?: boolean;
}

export interface ReadinessResult {
  done: number;
  total: number;
  criticalDone: number;
  criticalTotal: number;
  canStartCycle: boolean;
}

export const pondPrepApi = {
  template: (farmType: FarmType) =>
    apiClient.get<PrepTask[]>('/pond-prep/template', { params: { farmType } }),

  limeDose: (body: {
    soilPhTarget: number;
    soilPhNow: number;
    areaM2: number;
    bufferFactor?: number;
  }) => apiClient.post<{ limeKg: number }>('/pond-prep/lime-dose', body),

  readiness: (farmType: FarmType, completedKeys: string[]) =>
    apiClient.post<ReadinessResult>('/pond-prep/readiness', { farmType, completedKeys }),
};
