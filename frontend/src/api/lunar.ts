import apiClient from './client';

export interface MoonPhase {
  jd: number;
  phase: number;
  ageDays: number;
  illumination: number;
  name: string;
  moltLikelihood: number;
  daysToSpringTide: number;
  inMoltWindow: boolean;
}

export interface MoltVulnerabilityInput {
  do?: number;
  temp?: number;
  freeNh3?: number;
  phSwing?: number;
  mineralDeficitFrac?: number;
  diseaseHigh?: boolean;
  densityRatio?: number;
  tray?: 'empty' | 'few_left' | 'a_lot_left' | null;
}

export interface MoltRisk {
  moltPressure: number;
  vulnerability: number;
  score: number;
  band: 'Low' | 'Watch' | 'Critical';
  phaseRel: 'pre' | 'peak' | 'post' | 'none';
}

export const lunarApi = {
  /** Moon phase + molt likelihood for a date (ISO; default today). */
  phase: (date?: string) =>
    apiClient.get<MoonPhase>('/lunar/phase', { params: date ? { date } : {} }),

  /** Molt Risk Score for a pond given its latest data. */
  risk: (body: { date?: string; abwG: number; vulnerability?: MoltVulnerabilityInput }) =>
    apiClient.post<{ phase: MoonPhase; risk: MoltRisk }>('/lunar/risk', body),
};
