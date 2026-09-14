import apiClient from './client';
import type { MoltPhase, MoltWindow } from '../features/moltWindow';

export type MoltItemStatus = 'done' | 'pending' | 'violated' | 'missed';
export type MoltRoute = 'ChemicalLog' | 'WaterQualityLog' | 'FeedLog' | 'SamplingLog';

export interface MoltItem {
  key: string;
  phase: Exclude<MoltPhase, 'inter'>;
  priority: 'critical' | 'important' | 'routine';
  status: MoltItemStatus;
  source: 'auto' | 'manual';
  route?: MoltRoute;
  /** IST YYYY-MM-DD. Absent on a backend older than the missed/actionable deploy. */
  actionableFrom?: string;
  actionableUntil?: string;
  /** Can still be done today. Undefined (old backend) means yes. */
  actionable?: boolean;
}

export interface PondMolt {
  pondId: string;
  window: MoltWindow | null;
  phase: MoltPhase;
  eligible: boolean;
  sizeUnknown: boolean;
  abwG: number | null;
  items: MoltItem[];
  pendingCritical: number;
}

export interface MoltPondSummary {
  pondId: string;
  pondName: string;
  farmId: string;
  eligible: boolean;
  sizeUnknown: boolean;
  abwG: number | null;
  done: number;
  total: number;
  pendingCritical: number;
  needsAction: boolean;
}

/** Home's molt line, from `/alert-center/today`. */
export interface MoltWindowSummary {
  window: MoltWindow | null;
  phase: MoltPhase;
  next: MoltWindow;
  eligiblePonds: number;
  pondsWithPending: number;
}

export const moltApi = {
  /** Upcoming molt windows, current first (IST dates, true phase). */
  windows: (count = 3) => apiClient.get<MoltWindow[]>('/molt/windows', { params: { count } }),
  /** Every readable active pond with checklist progress. */
  ponds: () => apiClient.get<MoltPondSummary[]>('/molt/ponds'),
  pond: (pondId: string) => apiClient.get<PondMolt>(`/molt/ponds/${pondId}`),
  /** Tick / un-tick a manual item on the current window. */
  setAction: (pondId: string, body: { windowKey: string; actionKey: string; done: boolean }) =>
    apiClient.post<PondMolt>(`/molt/ponds/${pondId}/actions`, body),
};
