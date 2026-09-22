import { Controller, Get, Post, Body } from '@nestjs/common';
import { CachedRead } from '../common/response-cache';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AlertCenterService } from './alert-center.service';
import { EngineAlertService } from './engine-alert.service';
import type { AlertSeverity } from './alert-center.service';
import { PhotoDeletionService } from '../storage/photo-deletion.service';

interface EmitBody {
  pondId?: string;
  farmId?: string;
  source: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  steps?: string[];
}

/** Unified Alert Center: emit + per-pond morning briefing. */
@Controller('alert-center')
export class AlertCenterController {
  constructor(
    private readonly service: AlertCenterService,
    private readonly engineAlerts: EngineAlertService,
    private readonly photoDeletions: PhotoDeletionService,
  ) {}

  /** Per-pond morning briefing from the caller's unread (persisted) alerts. */
  @Get('briefing')
  @CachedRead(60)
  briefing(@CurrentUser() user) {
    return this.service.morningBriefing(user.id);
  }

  /**
   * LIVE briefing — engine alerts recomputed from each active pond's latest
   * logged data. Always current, never duplicated (not persisted).
   */
  @Get('live-briefing')
  @CachedRead(60)
  liveBriefing(@CurrentUser() user) {
    this.photoDeletions.drainSoon(); // F1: lazy R2 drain, never awaited
    return this.engineAlerts.liveBriefing(user.id);
  }

  /**
   * The home screen in one round trip: `{ contexts, briefing }`.
   *
   * Same body as `live-briefing`, plus the pond contexts it already computed
   * to produce it. The screen used to fetch live-briefing AND /pond-context
   * per farm, which walked the identical contexts a second time. Both of those
   * routes stay — other screens use them.
   */
  @Get('today')
  @CachedRead(60)
  today(@CurrentUser() user) {
    this.photoDeletions.drainSoon(); // F1: lazy R2 drain, never awaited
    return this.engineAlerts.today(user.id);
  }

  /** Every alert, one row each: `{ live, saved }` (Today's alerts screen). */
  @Get('all')
  @CachedRead(60)
  all(@CurrentUser() user) {
    return this.engineAlerts.all(user.id);
  }

  /**
   * "Mark done" on live engine alerts: hidden for the caller until the reading
   * behind each one changes. Keys come from the briefing / all responses.
   */
  @Post('dismiss')
  dismiss(@Body() body: { dismissKeys?: unknown }, @CurrentUser() user) {
    const keys = (Array.isArray(body?.dismissKeys) ? body.dismissKeys : [])
      .filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length <= 500)
      .slice(0, 50);
    return this.service.dismiss(user.id, keys);
  }

  /** Emit an alert into the unified stream. */
  @Post('emit')
  emit(@Body() body: EmitBody, @CurrentUser() user) {
    return this.service.emit({ ...body, userId: user.id });
  }
}
