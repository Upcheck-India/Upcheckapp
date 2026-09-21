import { Injectable, Logger } from '@nestjs/common';
import { DiseaseIndicatorsService } from '../disease-warning/disease-indicators.service';
import type { DiseaseName, DiseaseRisk } from '../disease-warning/disease-warning.service';
import { CriticalDisease, DiseaseAlertService } from './disease-alert.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, In } from 'typeorm';
import { Pond } from '../ponds/pond.entity';
import {
  PondContextService,
  PondContext,
} from '../pond-context/pond-context.service';
import {
  MoltService,
  PondMolt,
  MoltAlertActions,
  TextKey,
  moltAlertFor,
} from '../molt/molt.service';
import {
  currentMoltWindow,
  MoltPhase,
  MoltWindow,
} from '../molt/molt-window';
import {
  AlertCenterService,
  BriefingItem,
  SavedAlert,
  rank,
} from './alert-center.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { FREE_NH3, classify, thresholdFor } from '../common/wq-thresholds';

/**
 * Home's molt line. `window` is null outside a window; `next` is always the
 * coming window so the quiet line can still name a date.
 */
export interface MoltWindowSummary {
  window: MoltWindow | null;
  phase: MoltPhase;
  next: MoltWindow;
  eligiblePonds: number;
  pondsWithPending: number;
}

export interface AlertDraft {
  pondId: string | null;
  source: string;
  severity: 'info' | 'watch' | 'critical';
  title: string;
  body: string;
  steps: string[];
  /** Lunar only: what the client can tick or route (spec A.5). */
  actions?: MoltAlertActions;
  /** Lunar only: i18n keys beside the English (M1.6). */
  titleKey?: TextKey;
  bodyKey?: TextKey;
  stepKeys?: TextKey[];
  /** Disease alerts only (D7). */
  disease?: DiseaseName;
}

/** English fallback titles; the app shows `engines.disease.name_*`. */
const DISEASE_EN: Record<DiseaseName, string> = {
  WSSV: 'White spot (WSSV)',
  AHPND: 'Early mortality (AHPND/EMS)',
  EHP: 'EHP (slow growth)',
  WFD: 'White feces disease',
  Luminous: 'Luminous vibriosis',
  RMS: 'Running mortality (RMS)',
  LSS: 'Loose shell (LSS)',
};

export interface LiveAlert extends AlertDraft {
  key: string;
  farmId: string;
}

/**
 * Turns the farmer's latest logged data (pond-context) into actionable engine
 * alerts. These are computed LIVE for the morning briefing rather than
 * persisted, so they always reflect the most recent readings and never pile up
 * as duplicates. A future cron can persist/push a daily snapshot if wanted.
 */
@Injectable()
export class EngineAlertService {
  private readonly logger = new Logger(EngineAlertService.name);

  constructor(
    @InjectRepository(Pond)
    private readonly pondRepo: Repository<Pond>,
    private readonly pondContext: PondContextService,
    private readonly molt: MoltService,
    private readonly alertCenter: AlertCenterService,
    private readonly farmAccess: FarmAccessService,
    private readonly diseaseIndicators: DiseaseIndicatorsService,
    private readonly diseaseAlerts: DiseaseAlertService,
  ) {}

  /**
   * Evaluate a pond's context into alert drafts. Pure; uses only signals
   * derivable from logged data (free-NH3, DO, running FCR) plus the pond's
   * precomputed molt checklist (see MoltService.checklistsFor) and derived
   * disease risks (D7).
   */
  evaluate(ctx: PondContext, moltStatus?: PondMolt, risks: DiseaseRisk[] = []): AlertDraft[] {
    const drafts: AlertDraft[] = [];
    const wq = ctx.waterQuality;
    const push = (
      severity: AlertDraft['severity'],
      source: string,
      title: string,
      body: string,
      steps: string[],
    ) =>
      drafts.push({ pondId: ctx.pondId, source, severity, title, body, steps });

    // Limits come from the shared per-species table (common/wq-thresholds), the
    // same one the Day Score and the app's colours read.
    const nh3Zone =
      ctx.freeAmmoniaMgL != null ? classify(ctx.freeAmmoniaMgL, FREE_NH3) : null;

    // Free ammonia (toxic fraction).
    if (nh3Zone) {
      if (nh3Zone === 'critical') {
        push(
          'critical',
          'water',
          'Toxic ammonia',
          `Free NH₃ ${ctx.freeAmmoniaMgL} mg/L`,
          [
            'Stop or sharply reduce feeding',
            'Partial water exchange',
            'Add probiotics; verify pH is not spiking',
          ],
        );
      } else if (nh3Zone === 'caution') {
        push(
          'watch',
          'water',
          'Ammonia rising',
          `Free NH₃ ${ctx.freeAmmoniaMgL} mg/L`,
          ['Reduce ration', 'Increase aeration'],
        );
      }
    }

    // Dissolved oxygen.
    const doZone =
      wq?.dissolvedOxygen != null
        ? classify(wq.dissolvedOxygen, thresholdFor(ctx.species, 'do'))
        : 'optimal';
    if (wq?.dissolvedOxygen != null && doZone !== 'optimal') {
      const severity = doZone === 'critical' ? 'critical' : 'watch';
      push(
        severity,
        'aeration',
        'Low dissolved oxygen',
        `DO ${wq.dissolvedOxygen} mg/L`,
        [
          'Run all aerators now',
          'Hold feeding until DO recovers',
          'Avoid handling/stocking stress',
        ],
      );
    }

    // pH — critical band only (outside the species' critical limits); the
    // caution band is a colour on the log screen, not an alert.
    if (wq?.ph != null && classify(wq.ph, thresholdFor(ctx.species, 'ph')) === 'critical') {
      push('critical', 'water', 'pH out of safe range', `pH ${wq.ph}`, [
        'Check the reading again',
        'Partial water exchange',
        'Correct with lime (low pH) or molasses (high pH)',
      ]);
    }

    // Feed efficiency.
    if (ctx.runningFcr != null && ctx.runningFcr > 1.8) {
      push(
        'watch',
        'feed',
        'Feed efficiency dropping',
        `Running FCR ${ctx.runningFcr}`,
        ['Check feeding-tray residue', 'Trim the ration to avoid overfeeding'],
      );
    }

    // Molt window checklist (eligible ponds only; resolves once items are done).
    const a = moltStatus ? moltAlertFor(moltStatus) : null;
    if (a) {
      push(a.severity, 'lunar', a.title, a.body, a.steps);
      Object.assign(drafts[drafts.length - 1], {
        actions: a.actions,
        titleKey: a.titleKey,
        bodyKey: a.bodyKey,
        stepKeys: a.stepKeys,
      });
    }

    // Disease early warning (D7): Critical and Watch bands; Low stays quiet.
    for (const r of risks) {
      if (r.band === 'Low') continue;
      const band = r.band === 'Critical' ? 'critical' : 'watch';
      push(band, 'disease', DISEASE_EN[r.disease], `${r.band} risk · based on ${r.coverage.known} of ${r.coverage.total} signs`, r.steps);
      Object.assign(drafts[drafts.length - 1], {
        disease: r.disease,
        titleKey: { key: `engines.disease.name_${r.disease}` },
        bodyKey: { key: `engines.disease.alertBody_${band}`, params: r.coverage },
        stepKeys: r.stepKeys,
      });
    }

    return drafts;
  }

  /**
   * Disease risks per pond (D7), plus the Critical push (once per pond +
   * disease per 3 days). Never fails the read: on error, no disease alerts.
   */
  private async diseaseFor(contexts: PondContext[]): Promise<Map<string, DiseaseRisk[]>> {
    const out = new Map<string, DiseaseRisk[]>();
    if (!contexts.length) return out;
    try {
      const assessed = await this.diseaseIndicators.assess(contexts);
      const criticals: CriticalDisease[] = [];
      for (const [pondId, a] of assessed) {
        out.set(pondId, a.risks);
        for (const r of a.risks) if (r.band === 'Critical') criticals.push({ pondId, disease: r.disease });
      }
      await this.diseaseAlerts.notify(criticals);
    } catch (err: any) {
      this.logger.warn(`Disease early warning skipped: ${err?.message ?? err}`);
    }
    return out;
  }

  /** Molt checklists for a set of contexts — a fixed number of queries. */
  private moltFor(contexts: PondContext[]): Promise<Map<string, PondMolt>> {
    return this.molt.checklistsFor(
      contexts.map((c) => ({ pondId: c.pondId, cropId: c.cropId, abwG: c.abwG })),
    );
  }

  /**
   * Every active pond's context across the user's farms.
   *
   * Split out of `liveBriefing` so `today` can hand the same contexts to the
   * client instead of throwing them away: the home screen needs both the
   * contexts and the alerts derived from them, and computing each pond's
   * context twice (once here, once via /pond-context) was the single biggest
   * source of queries on that screen.
   */
  private async activeContexts(userId: string): Promise<PondContext[]> {
    const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
    if (farmIds.length === 0) return [];

    /**
     * PER-POND scope, not just farm scope.
     *
     * This used to read every pond on an accessible farm and lean on
     * `getContext`'s own check to drop the ones the caller may not read — the
     * errors were swallowed, so it worked, but only as a side effect. Asking
     * the access layer up front keeps that guarantee explicit now that the
     * contexts are built in bulk: `getAccessiblePondIds` resolves the
     * farm-level capability AND `farm_member_ponds` scoping.
     *
     * Set-based across every farm (≤4 queries), not 3–4 per farm.
     */
    const readable = new Set(
      await this.farmAccess.getAccessiblePondIdsForFarms(userId, farmIds, 'READ'),
    );
    if (readable.size === 0) return [];

    const mine = await this.pondRepo.find({
      where: {
        activeCycleId: Not(IsNull()),
        id: In([...readable]),
      },
    });
    if (mine.length === 0) return [];

    /**
     * Build every context in ONE set-based pass.
     *
     * This was a per-pond fan-out in batches of five — a limit chosen when the
     * connection pool was 5. At ~7 queries per pond, a 43-pond account meant
     * ~300 statements in NINE sequential batches; every one of them a round
     * trip to Supabase in Singapore from a backend in Oregon (~180ms), so this
     * single method took 10-15s and tripped the client's 15s timeout. It runs
     * on `/alert-center/today` AND `/alert-center/live-briefing`, which is why
     * Today, the pond page and Money were all slow at once.
     *
     * `buildContextsFor` does it in 9 queries regardless of pond count. It
     * performs no access checks of its own, which is why the pond set above is
     * resolved through the access layer first.
     */
    return this.pondContext.buildContextsFor(mine.map((p) => p.id));
  }

  /** Roll evaluated contexts into the briefing shape the client renders. */
  private briefingFrom(
    contexts: PondContext[],
    molts: Map<string, PondMolt>,
    disease: Map<string, DiseaseRisk[]>,
  ): BriefingItem[] {
    const drafts: AlertDraft[] = contexts.flatMap((ctx) =>
      this.evaluate(ctx, molts.get(ctx.pondId), disease.get(ctx.pondId)),
    );
    return this.alertCenter.buildBriefing(
      drafts.map((d) => ({
        pondId: d.pondId,
        severity: d.severity,
        title: d.title,
        data: {
          source: d.source,
          steps: d.steps,
          ...(d.actions ? { actions: d.actions } : {}),
          ...(d.titleKey ? { titleKey: d.titleKey, stepKeys: d.stepKeys } : {}),
        },
      })),
    );
  }

  /** Live per-pond briefing across all of a user's active ponds. */
  async liveBriefing(userId: string): Promise<BriefingItem[]> {
    const contexts = await this.activeContexts(userId);
    const [molts, disease] = await Promise.all([
      this.moltFor(contexts),
      this.diseaseFor(contexts),
    ]);
    return this.briefingFrom(contexts, molts, disease);
  }

  /**
   * Every alert, uncollapsed (GET /alert-center/all): each live engine draft for
   * the same pond set `today` reads, plus every unread persisted alert.
   * `buildBriefing` keeps one per pond; this screen shows them all.
   */
  async all(userId: string): Promise<{ live: LiveAlert[]; saved: SavedAlert[] }> {
    const [contexts, saved] = await Promise.all([
      this.activeContexts(userId),
      this.alertCenter.savedAlerts(userId),
    ]);
    const [molts, disease] = await Promise.all([
      contexts.length ? this.moltFor(contexts) : new Map<string, PondMolt>(),
      this.diseaseFor(contexts),
    ]);
    const live: LiveAlert[] = contexts.flatMap((ctx) =>
      this.evaluate(ctx, molts.get(ctx.pondId), disease.get(ctx.pondId)).map((d) => ({
        ...d,
        farmId: ctx.farmId,
        // Stable across refreshes: counts in titles ("2 actions pending") change.
        key: `${d.source}:${d.pondId}:${d.title.replace(/\d+/g, '#')}`,
      })),
    );
    live.sort(
      (a, b) =>
        rank(b.severity) - rank(a.severity) ||
        String(a.pondId).localeCompare(String(b.pondId)),
    );
    return { live, saved };
  }

  /**
   * The home screen in one request: the contexts AND the briefing computed
   * from them.
   *
   * The screen used to call /alert-center/live-briefing and /pond-context per
   * farm, and both walked every active pond's context — the same contexts,
   * computed twice, roughly 56 queries on a 3-pond account against a pool of
   * 5. `evaluate` is pure over a context, so this is only a matter of not
   * discarding what liveBriefing already had in hand.
   */
  async today(userId: string): Promise<{
    contexts: PondContext[];
    briefing: BriefingItem[];
    moltWindow: MoltWindowSummary;
  }> {
    const contexts = await this.activeContexts(userId);
    const [molts, disease] = await Promise.all([
      contexts.length ? this.moltFor(contexts) : new Map<string, PondMolt>(),
      this.diseaseFor(contexts),
    ]);
    const { window, phase, next } = currentMoltWindow(new Date());
    const all = [...molts.values()];
    return {
      contexts,
      briefing: this.briefingFrom(contexts, molts, disease),
      moltWindow: {
        window,
        phase,
        next,
        eligiblePonds: all.filter((m) => m.eligible).length,
        pondsWithPending: all.filter((m) => moltAlertFor(m) !== null).length,
      },
    };
  }
}
