import { Injectable } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import type { MoltAlertActions, TextKey } from '../molt/molt.service';

export type AlertSeverity = 'info' | 'watch' | 'critical';

export interface EmitAlertInput {
  userId: string;
  pondId?: string;
  farmId?: string;
  source: string; // which engine: feed | disease | lunar | harvest | aeration | weather | ...
  severity: AlertSeverity;
  title: string;
  body: string;
  steps?: string[];
}

export interface BriefingItem {
  pondId: string | null;
  topTitle: string;
  topSeverity: AlertSeverity;
  source: string;
  steps: string[];
  alertCount: number;
  /** Lunar molt alerts: items the client can tick or route. */
  actions?: MoltAlertActions;
  /** Lunar molt alerts: i18n keys beside topTitle / steps (M1.6). */
  titleKey?: TextKey;
  stepKeys?: TextKey[];
}

/** One unread persisted alert, uncollapsed (GET /alert-center/all). */
export interface SavedAlert {
  id: string;
  pondId: string | null;
  farmId: string | null;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  steps: string[];
  createdAt: Date;
  /** Compliance alerts (D3): i18n keys + params beside the English title/message. */
  titleKey?: TextKey;
  bodyKey?: TextKey;
}

/** Higher severity sorts first. */
export const SEVERITY_RANK: Record<string, number> = {
  critical: 3,
  watch: 2,
  warning: 2,
  info: 1,
};
export const rank = (s: string) => SEVERITY_RANK[s] ?? 0;

/**
 * Unified Alert Center (farmer_features_spec.md "Cross-cutting"). Every engine
 * emits into the one Alert stream via {@link emit}; {@link buildBriefing} rolls
 * the unread alerts into a per-pond morning briefing (top action per pond).
 *
 * Built on the existing AlertsService — `source` + `steps` ride in the alert's
 * `data` payload so no schema change is needed.
 */
@Injectable()
export class AlertCenterService {
  constructor(private readonly alerts: AlertsService) {}

  /** Emit an engine alert into the unified stream. */
  emit(input: EmitAlertInput) {
    return this.alerts.create({
      userId: input.userId,
      pondId: input.pondId,
      farmId: input.farmId,
      type: input.source,
      title: input.title,
      message: input.body,
      // Persist on the same 'info'|'warning'|'critical' vocabulary the rest
      // of the app writes/filters on — 'watch' is this module's internal
      // name for the same thing as 'warning' (AUDIT id 53).
      severity: input.severity === 'watch' ? 'warning' : input.severity,
      data: { source: input.source, steps: input.steps ?? [], status: 'open' },
    } as any);
  }

  /**
   * Roll a flat alert list into a per-pond briefing: one card per pond showing
   * its highest-severity action, ordered by severity. Pure + testable.
   */
  buildBriefing(alerts: any[]): BriefingItem[] {
    const byPond = new Map<string | null, any[]>();
    for (const a of alerts) {
      const key = a.pondId ?? null;
      if (!byPond.has(key)) byPond.set(key, []);
      byPond.get(key)!.push(a);
    }
    const items: BriefingItem[] = [];
    for (const [pondId, list] of byPond) {
      const top = [...list].sort(
        (x, y) => rank(y.severity) - rank(x.severity),
      )[0];
      const data = top.data ?? {};
      items.push({
        pondId,
        topTitle: top.title,
        topSeverity: top.severity,
        source: data.source ?? top.type ?? 'unknown',
        steps: data.steps ?? [],
        alertCount: list.length,
        // The top alert's own actions only — never another alert's.
        ...(data.actions ? { actions: data.actions } : {}),
        ...(data.titleKey ? { titleKey: data.titleKey, stepKeys: data.stepKeys } : {}),
      });
    }
    return items.sort((a, b) => rank(b.topSeverity) - rank(a.topSeverity));
  }

  /** Every unread persisted alert, one row each, severity on the 'watch' vocabulary. */
  async savedAlerts(userId: string): Promise<SavedAlert[]> {
    const unread = (await this.alerts.findByUser(userId, true)) as any[];
    return unread.map((a) => ({
      id: a.id,
      pondId: a.pondId ?? null,
      farmId: a.farmId ?? null,
      type: a.type,
      severity:
        a.severity === 'warning' || a.severity === 'watch'
          ? 'watch'
          : a.severity === 'critical'
            ? 'critical'
            : 'info',
      title: a.title,
      message: a.message,
      steps: a.data?.steps ?? [],
      createdAt: a.createdAt,
      ...(a.data?.titleKey
        ? { titleKey: a.data.titleKey, bodyKey: a.data.bodyKey }
        : {}),
    }));
  }

  /** Morning briefing from the user's unread alerts. */
  async morningBriefing(userId: string): Promise<BriefingItem[]> {
    const unread = await this.alerts.findByUser(userId, true);
    return this.buildBriefing(unread as any[]);
  }
}
