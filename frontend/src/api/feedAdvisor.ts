import apiClient from './client';

export type TrayResidue = 'empty' | 'few_left' | 'a_lot_left';

export interface RationInput {
  livePopulation: number;
  abwG: number;
  /** Cultured species (free text); selects the species FR table server-side. */
  species?: string;
  fr?: number;
  lastTray?: TrayResidue;
  inMoltPeak?: boolean;
  do?: number;
  nh3?: number;
  temp?: number;
  fasting?: boolean;
  mealsPerDay?: number;
}

export interface RationResult {
  biomassKg: number;
  frPct: number;
  baseRationKg: number;
  recommendedKg: number;
  perMeal: number[];
  factors: { tray: number; molt: number; env: number; fasting: number };
  reasons: string[];
}

export interface FeedPlan extends RationResult {
  id: string;
  pondId: string;
  cropId: string | null;
  date: string;
  actualKg: number | null;
  adherence: number | null;
  createdAt: string;
}

export const feedAdvisorApi = {
  /** Pure ration preview (no persistence). */
  compute: (input: RationInput) =>
    apiClient.post<RationResult>('/feed-advisor/compute', input),

  /** Generate + persist today's plan. */
  generate: (input: {
    pondId: string;
    cropId?: string;
    date: string;
    input: RationInput;
  }) => apiClient.post<FeedPlan>('/feed-advisor', input),

  recent: (pondId: string) =>
    apiClient.get<FeedPlan[]>(`/feed-advisor/pond/${pondId}`),

  /** Log what was actually fed → adherence. */
  logActual: (id: string, actualKg: number) =>
    apiClient.patch<FeedPlan>(`/feed-advisor/${id}/actual`, { actualKg }),
};
