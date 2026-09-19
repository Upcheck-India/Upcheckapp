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

  /**
   * TRUE phase dates (E5.1), corrected per Meeus ch. 49 and already bucketed
   * into IST by the server. The mean-phase figures above can be ±14 h out,
   * which is enough to name the wrong day — and this audience checks the app
   * against the Panchang.
   */
  nextNewMoonIst?: string;
  nextFullMoonIst?: string;
  nextNewMoonAt?: string;
  nextFullMoonAt?: string;
  trueDaysToSpringTide?: number;
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
  /** Vulnerability factors that had a reading / total factors; absent on an older backend. */
  vulnerabilityKnown?: number;
  vulnerabilityTotal?: number;
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
  /** i18n key + params (M1.6); absent on an older backend → render `text`. */
  key?: string;
  params?: Record<string, string | number>;
}

export interface LunarPlaybook {
  phaseRel: 'pre' | 'peak' | 'post' | 'inter';
  phaseLabel: string;
  headline: string;
  note: string;
  steps: PlaybookStep[];
  /** i18n keys beside the English (M1.6); absent on an older backend. */
  phaseLabelKey?: string;
  headlineKey?: string;
  headlineParams?: Record<string, string | number>;
  headlineCritical?: boolean;
  noteKey?: string;
}

export const lunarApi = {
  /** Moon phase + molt likelihood for a date (ISO; default today). */
  phase: (date?: string) =>
    apiClient.get<MoonPhase>('/lunar/phase', { params: date ? { date } : {} }),

  /** Molt Risk Score + phase action playbook for a pond given its latest data. */
  risk: (body: { date?: string; abwG: number; vulnerability?: MoltVulnerabilityInput }) =>
    apiClient.post<{ phase: MoonPhase; risk: MoltRisk; playbook: LunarPlaybook }>('/lunar/risk', body),
};
