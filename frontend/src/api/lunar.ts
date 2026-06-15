import apiClient from './client';

export interface MoonPhase {
  jd: number;
  phase: number;
  ageDays: number;
  illumination: number;
  name: string;
  moltLikelihood: number;
  daysToSpringTide: number;
  signedDaysToSpringTide: number;
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
  salinity?: number;
}

export interface MoltRisk {
  moltPressure: number;
  vulnerability: number;
  score: number;
  band: 'Low' | 'Watch' | 'Critical';
  phaseRel: 'pre' | 'peak' | 'post' | 'none';
}

export type StepCategory =
  | 'mineral' | 'aeration' | 'feed' | 'handling'
  | 'biosecurity' | 'water' | 'monitoring' | 'general';

export type StepPriority = 'critical' | 'important' | 'routine';

export interface PlaybookStep {
  category: StepCategory;
  priority: StepPriority;
  text: string;
  trigger?: string;
}

export interface LunarPlaybook {
  phaseRel: 'pre' | 'peak' | 'post' | 'inter';
  phaseLabel: string;
  headline: string;
  note: string;
  steps: PlaybookStep[];
}

export const lunarApi = {
  /** Moon phase + molt likelihood for a date (ISO; default today). */
  phase: (date?: string) =>
    apiClient.get<MoonPhase>('/lunar/phase', { params: date ? { date } : {} }),

  /** Molt Risk Score + phase action playbook for a pond given its latest data. */
  risk: (body: { date?: string; abwG: number; vulnerability?: MoltVulnerabilityInput }) =>
    apiClient.post<{ phase: MoonPhase; risk: MoltRisk; playbook: LunarPlaybook }>('/lunar/risk', body),
};
