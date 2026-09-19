import apiClient from './client';
import i18n from '../i18n';
import { queryClient } from '../query/client';
import type { PondContext } from './pondContext';
import type { MoltWindowSummary } from './molt';

export type AlertSeverity = 'info' | 'watch' | 'critical';

/** An app i18n key + params the backend sends beside its English (molt alerts, M1.6). */
export interface TextKey {
  key: string;
  params?: Record<string, string | number>;
}

export interface BriefingItem {
  pondId: string | null;
  topTitle: string;
  topSeverity: AlertSeverity;
  source: string;
  steps: string[];
  alertCount: number;
  /** Lunar only, and absent on an older backend: one entry per step, so a client can tick or route. */
  actions?: BriefingActions;
  /** Lunar only, absent on an older backend: keys for topTitle / steps. */
  titleKey?: TextKey;
  stepKeys?: TextKey[];
}

export interface BriefingActions {
  pondId: string;
  windowKey: string;
  items: { key: string; source: 'auto' | 'manual'; route: string | null }[];
}

/** One live engine alert, uncollapsed (GET /alert-center/all). */
export interface LiveAlert {
  key: string;
  pondId: string | null;
  farmId: string;
  source: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  steps: string[];
  actions?: BriefingActions;
  titleKey?: TextKey;
  bodyKey?: TextKey;
  stepKeys?: TextKey[];
}

/** One unread persisted alert (GET /alert-center/all). */
export interface SavedAlert {
  id: string;
  pondId: string | null;
  farmId: string | null;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  steps: string[];
  createdAt: string;
  /** Compliance alerts (D3): keys beside title / message. */
  titleKey?: TextKey;
  bodyKey?: TextKey;
}

/**
 * Render the backend's keys in the farmer's language, keeping its English
 * wherever a key is absent (older backend) or unknown (older app bundle).
 * Done once here, at the fetch, so every screen that shows an alert gets it.
 */
const tr = (k: TextKey | undefined, english: string): string =>
  (k && (i18n.t(k.key, { ...k.params, defaultValue: '' }) as string)) || english;
const trSteps = (keys: TextKey[] | undefined, english: string[]) =>
  keys && keys.length === english.length ? keys.map((k, i) => tr(k, english[i])) : english;

export const localizeBriefing = (b: BriefingItem): BriefingItem =>
  b.titleKey ? { ...b, topTitle: tr(b.titleKey, b.topTitle), steps: trSteps(b.stepKeys, b.steps) } : b;

export const localizeLiveAlert = (a: LiveAlert): LiveAlert =>
  a.titleKey
    ? { ...a, title: tr(a.titleKey, a.title), body: tr(a.bodyKey, a.body), steps: trSteps(a.stepKeys, a.steps) }
    : a;

export const localizeSavedAlert = (a: SavedAlert): SavedAlert =>
  a.titleKey ? { ...a, title: tr(a.titleKey, a.title), message: tr(a.bodyKey, a.message) } : a;

// Cached alerts were rendered in the old language: refetch them on a switch.
i18n.on?.('languageChanged', () => {
  void queryClient.invalidateQueries({ queryKey: ['briefing'] });
  void queryClient.invalidateQueries({ queryKey: ['home'] });
});

export const alertCenterApi = {
  /** Every alert, one row each — live engine drafts plus unread saved alerts. */
  all: () =>
    apiClient
      .get<{ live: LiveAlert[]; saved: SavedAlert[] }>('/alert-center/all')
      .then((r) => ({
        ...r,
        data: {
          ...r.data,
          live: (r.data?.live ?? []).map(localizeLiveAlert),
          saved: (r.data?.saved ?? []).map(localizeSavedAlert),
        },
      })),

  /** Per-pond morning briefing (top action per pond) from unread alerts. */
  briefing: () =>
    apiClient
      .get<BriefingItem[]>('/alert-center/briefing')
      .then((r) => ({ ...r, data: (r.data ?? []).map(localizeBriefing) })),

  /**
   * The home screen in ONE request: the pond snapshots AND the alerts derived
   * from them.
   *
   * `live-briefing` computed a full context per active pond and threw the
   * contexts away; the screen then fetched the same contexts again per farm
   * for its biomass and logs figures. Same expensive work, twice, on every
   * visit. This returns both from one pass.
   */
  today: () =>
    apiClient.get<{
      contexts: PondContext[];
      briefing: BriefingItem[];
      /** Absent on a backend older than the molt-window deploy. */
      moltWindow?: MoltWindowSummary | null;
    }>('/alert-center/today')
      .then((r) => ({ ...r, data: { ...r.data, briefing: (r.data?.briefing ?? []).map(localizeBriefing) } })),

  /** Live briefing — engine alerts recomputed from each pond's latest data. */
  liveBriefing: () =>
    apiClient
      .get<BriefingItem[]>('/alert-center/live-briefing')
      .then((r) => ({ ...r, data: (r.data ?? []).map(localizeBriefing) })),

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
