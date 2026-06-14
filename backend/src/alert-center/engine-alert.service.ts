import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Pond } from '../ponds/pond.entity';
import { PondContextService, PondContext } from '../pond-context/pond-context.service';
import { LunarService } from '../lunar/lunar.service';
import { AlertCenterService, BriefingItem } from './alert-center.service';

export interface AlertDraft {
  pondId: string | null;
  source: string;
  severity: 'info' | 'watch' | 'critical';
  title: string;
  body: string;
  steps: string[];
}

/**
 * Turns the farmer's latest logged data (pond-context) into actionable engine
 * alerts. These are computed LIVE for the morning briefing rather than
 * persisted, so they always reflect the most recent readings and never pile up
 * as duplicates. A future cron can persist/push a daily snapshot if wanted.
 */
@Injectable()
export class EngineAlertService {
  constructor(
    @InjectRepository(Pond)
    private readonly pondRepo: Repository<Pond>,
    private readonly pondContext: PondContextService,
    private readonly lunar: LunarService,
    private readonly alertCenter: AlertCenterService,
  ) {}

  /**
   * Evaluate a pond's context into alert drafts. Pure given `now`; uses only
   * signals derivable from logged data (free-NH3, DO, running FCR, lunar molt).
   */
  evaluate(ctx: PondContext, now = new Date()): AlertDraft[] {
    const drafts: AlertDraft[] = [];
    const wq = ctx.waterQuality;
    const push = (severity: AlertDraft['severity'], source: string, title: string, body: string, steps: string[]) =>
      drafts.push({ pondId: ctx.pondId, source, severity, title, body, steps });

    // Free ammonia (toxic fraction).
    if (ctx.freeAmmoniaMgL != null) {
      if (ctx.freeAmmoniaMgL > 0.3) {
        push('critical', 'water', 'Toxic ammonia', `Free NH₃ ${ctx.freeAmmoniaMgL} mg/L`, [
          'Stop or sharply reduce feeding',
          'Partial water exchange',
          'Add probiotics; verify pH is not spiking',
        ]);
      } else if (ctx.freeAmmoniaMgL > 0.1) {
        push('watch', 'water', 'Ammonia rising', `Free NH₃ ${ctx.freeAmmoniaMgL} mg/L`, [
          'Reduce ration', 'Increase aeration',
        ]);
      }
    }

    // Dissolved oxygen.
    if (wq?.dissolvedOxygen != null && wq.dissolvedOxygen < 4) {
      const severity = wq.dissolvedOxygen < 3 ? 'critical' : 'watch';
      push(severity, 'aeration', 'Low dissolved oxygen', `DO ${wq.dissolvedOxygen} mg/L`, [
        'Run all aerators now',
        'Hold feeding until DO recovers',
        'Avoid handling/stocking stress',
      ]);
    }

    // Feed efficiency.
    if (ctx.runningFcr != null && ctx.runningFcr > 1.8) {
      push('watch', 'feed', 'Feed efficiency dropping', `Running FCR ${ctx.runningFcr}`, [
        'Check feeding-tray residue', 'Trim the ration to avoid overfeeding',
      ]);
    }

    // Lunar molt risk (needs latest ABW).
    if (ctx.abwG != null) {
      const phase = this.lunar.moonPhase(now);
      const risk = this.lunar.computeMoltRisk(phase, ctx.abwG, {
        do: wq?.dissolvedOxygen ?? undefined,
        freeNh3: ctx.freeAmmoniaMgL ?? undefined,
        temp: wq?.temperature ?? undefined,
      });
      if (risk.band === 'Critical') {
        push('critical', 'lunar', 'Molt-peak risk', `Molt risk ${risk.score}`, [
          'Cut feed 15–30%',
          'Maximize aeration 02:00–06:00',
          'No handling, sampling or treatments',
        ]);
      } else if (risk.band === 'Watch' && phase.inMoltWindow) {
        push('watch', 'lunar', 'Molt window approaching', `Molt risk ${risk.score}`, [
          'Raise alkalinity ≥120 ppm', 'Top up Ca/Mg/K before the molt',
        ]);
      }
    }

    return drafts;
  }

  /** Live per-pond briefing across all of a user's active ponds. */
  async liveBriefing(userId: string): Promise<BriefingItem[]> {
    const ponds = await this.pondRepo.find({
      where: { activeCycleId: Not(IsNull()) },
      relations: ['farm'],
    });
    const mine = ponds.filter((p) => (p as any).farm?.userId === userId);

    const drafts: AlertDraft[] = [];
    for (const p of mine) {
      try {
        const ctx = await this.pondContext.getContext(p.id, userId);
        drafts.push(...this.evaluate(ctx));
      } catch {
        // Skip a pond that errors; don't fail the whole briefing.
      }
    }

    return this.alertCenter.buildBriefing(
      drafts.map((d) => ({
        pondId: d.pondId,
        severity: d.severity,
        title: d.title,
        data: { source: d.source, steps: d.steps },
      })),
    );
  }
}
