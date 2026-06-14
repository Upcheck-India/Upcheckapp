import apiClient from './client';

export type AlertSeverity = 'info' | 'watch' | 'critical';

export interface BriefingItem {
  pondId: string | null;
  topTitle: string;
  topSeverity: AlertSeverity;
  source: string;
  steps: string[];
  alertCount: number;
}

export const alertCenterApi = {
  /** Per-pond morning briefing (top action per pond) from unread alerts. */
  briefing: () => apiClient.get<BriefingItem[]>('/alert-center/briefing'),

  /** Live briefing — engine alerts recomputed from each pond's latest data. */
  liveBriefing: () => apiClient.get<BriefingItem[]>('/alert-center/live-briefing'),

  /** Emit an alert into the unified stream. */
  emit: (body: {
    pondId?: string;
    farmId?: string;
    source: string;
    severity: AlertSeverity;
    title: string;
    body: string;
    steps?: string[];
  }) => apiClient.post('/alert-center/emit', body),
};
