import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { MoltAction } from './molt-action.entity';
import { Pond } from '../ponds/pond.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { istDayRangeUtc } from '../common/ist-date';
import {
  MoltPhase,
  MoltWindow,
  addDays,
  currentMoltWindow,
  upcomingWindows,
} from './molt-window';

export type MoltPriority = 'critical' | 'important' | 'routine';
export type MoltItemStatus = 'done' | 'pending' | 'violated';
export type MoltRoute = 'ChemicalLog' | 'WaterQualityLog' | 'FeedLog' | 'SamplingLog';

export interface MoltItem {
  key: string;
  phase: Exclude<MoltPhase, 'inter'>;
  priority: MoltPriority;
  status: MoltItemStatus;
  source: 'auto' | 'manual';
  route?: MoltRoute;
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

/** What the logs say for one pond in one window. */
export interface MoltEvidence {
  /** chemical_data or treatment logged pre..peak end. */
  minerals: boolean;
  /** alkalinity logged (water quality or chemistry) pre..peak end. */
  alkalinity: boolean;
  /** DO logged in peak. */
  peakDo: boolean;
  /** sampling or harvest logged in peak. */
  handlingInPeak: boolean;
  /** sampling logged in post. */
  postSampling: boolean;
  /** Mean daily feed (kg) over the logged days of the 3 days before pre; null = no baseline. */
  feedBaselineKg: number | null;
  /** Daily feed totals (kg) for each logged peak day. */
  peakFeedDaysKg: number[];
}

/** Below this ABW molting is not lunar-locked, so no window checklist. */
export const MOLT_MIN_ABW_G = 5;
const FEED_CUT_RATIO = 0.85;

interface ItemDef {
  key: string;
  phase: Exclude<MoltPhase, 'inter'>;
  priority: MoltPriority;
  manual?: true;
  route?: MoltRoute;
  /** English step text for the alert-center briefing (sibling-engine convention). */
  text: string;
}

export const MOLT_ITEMS: ItemDef[] = [
  { key: 'minerals', phase: 'pre', priority: 'important', route: 'ChemicalLog', text: 'Dose minerals (Ca/Mg/K) and log it' },
  { key: 'alkalinity_check', phase: 'pre', priority: 'important', route: 'WaterQualityLog', text: 'Check and log alkalinity (target ≥120 ppm)' },
  { key: 'aerator_service', phase: 'pre', priority: 'routine', manual: true, text: 'Service aerators before the peak' },
  { key: 'feed_cut', phase: 'peak', priority: 'critical', route: 'FeedLog', text: 'Cut feed 15–30% on peak days' },
  { key: 'no_handling', phase: 'peak', priority: 'critical', text: 'No sampling, netting or harvest during the peak' },
  { key: 'night_do_check', phase: 'peak', priority: 'critical', route: 'WaterQualityLog', text: 'Check and log night/pre-dawn DO' },
  { key: 'restore_feed', phase: 'post', priority: 'important', manual: true, text: 'Restore feed as appetite returns' },
  { key: 'post_sampling', phase: 'post', priority: 'routine', route: 'SamplingLog', text: 'Sample once shells harden' },
  { key: 'soft_shell_check', phase: 'post', priority: 'routine', manual: true, text: 'Check for soft shells and cannibalism' },
];

const PHASE_ORDER: Record<MoltPhase, number> = { pre: 0, peak: 1, post: 2, inter: -1 };
const PRIORITY_ORDER: Record<MoltPriority, number> = { critical: 0, important: 1, routine: 2 };

/** Checklist for the current phase (and earlier phases of the same window). */
export function deriveItems(
  phase: MoltPhase,
  ev: MoltEvidence,
  manualDone: Set<string>,
): MoltItem[] {
  return MOLT_ITEMS.filter((d) => PHASE_ORDER[d.phase] <= PHASE_ORDER[phase]).map(
    (d) => {
      const item = (status: MoltItemStatus, source: 'auto' | 'manual'): MoltItem => ({
        key: d.key,
        phase: d.phase,
        priority: d.priority,
        status,
        source,
        ...(d.route ? { route: d.route } : {}),
      });
      const manual = () => item(manualDone.has(d.key) ? 'done' : 'pending', 'manual');
      const auto = (ok: boolean) => item(ok ? 'done' : 'pending', 'auto');

      if (d.manual) return manual();
      switch (d.key) {
        case 'minerals':
          return auto(ev.minerals);
        case 'alkalinity_check':
          return auto(ev.alkalinity);
        case 'night_do_check':
          return auto(ev.peakDo);
        case 'post_sampling':
          return auto(ev.postSampling);
        case 'no_handling':
          return item(ev.handlingInPeak ? 'violated' : 'done', 'auto');
        case 'feed_cut': {
          if (!ev.feedBaselineKg) return manual();
          const limit = ev.feedBaselineKg * FEED_CUT_RATIO;
          return auto(
            ev.peakFeedDaysKg.length > 0 &&
              ev.peakFeedDaysKg.every((kg) => kg <= limit),
          );
        }
        default:
          return manual();
      }
    },
  );
}

/** The one alert a pond's molt checklist produces, or null. */
export function moltAlertFor(
  pm: PondMolt,
): { severity: 'critical' | 'watch'; title: string; body: string; steps: string[] } | null {
  if (!pm.eligible || !pm.window) return null;
  const open = pm.items
    .filter((i) => i.status !== 'done' && i.priority !== 'routine')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  if (open.length === 0) return null;
  const n = open.length;
  const pending = `${n} action${n === 1 ? '' : 's'} pending`;
  const critical = pm.phase === 'peak' && open.some((i) => i.priority === 'critical');
  const label =
    pm.phase === 'peak' ? 'Molt peak' : pm.phase === 'pre' ? 'Molt window opening' : 'Post-molt';
  return {
    severity: critical ? 'critical' : 'watch',
    title: `${label} — ${pending}`,
    body: `${pm.window.kind === 'new' ? 'New' : 'Full'} moon ${pm.window.peakDate}`,
    steps: open.map((i) => MOLT_ITEMS.find((d) => d.key === i.key)!.text),
  };
}

export interface PondRef {
  pondId: string;
  cropId: string | null;
  abwG: number | null;
}

@Injectable()
export class MoltService {
  constructor(
    @InjectRepository(MoltAction)
    private readonly actions: Repository<MoltAction>,
    @InjectRepository(Pond)
    private readonly ponds: Repository<Pond>,
    private readonly dataSource: DataSource,
    private readonly farmAccess: FarmAccessService,
  ) {}

  windows(count: number, now = new Date()): MoltWindow[] {
    return upcomingWindows(now, count);
  }

  /**
   * Checklists for many ponds in a fixed number of set-based queries (no
   * per-pond fan-out). Performs NO access checks — callers pass ponds they
   * already resolved through FarmAccessService.
   */
  async checklistsFor(refs: PondRef[], now = new Date()): Promise<Map<string, PondMolt>> {
    const { window, phase } = currentMoltWindow(now);
    const out = new Map<string, PondMolt>();
    const eligible: PondRef[] = [];
    for (const r of refs) {
      const isEligible = !!r.cropId && r.abwG != null && r.abwG >= MOLT_MIN_ABW_G;
      if (isEligible) eligible.push(r);
      out.set(r.pondId, {
        pondId: r.pondId,
        window,
        phase,
        eligible: isEligible,
        sizeUnknown: !!r.cropId && r.abwG == null,
        abwG: r.abwG,
        items: [],
        pendingCritical: 0,
      });
    }
    if (!window || eligible.length === 0) return out;

    const { evidence, manual } = await this.loadEvidence(eligible, window);
    for (const r of eligible) {
      const pm = out.get(r.pondId)!;
      pm.items = deriveItems(phase, evidence.get(r.pondId)!, manual.get(r.pondId) ?? new Set());
      pm.pendingCritical = pm.items.filter(
        (i) => i.priority === 'critical' && i.status !== 'done',
      ).length;
    }
    return out;
  }

  private async loadEvidence(
    refs: PondRef[],
    w: MoltWindow,
  ): Promise<{ evidence: Map<string, MoltEvidence>; manual: Map<string, Set<string>> }> {
    const pondIds = refs.map((r) => r.pondId);
    const cropIds = refs.map((r) => r.cropId as string);
    const postStart = addDays(w.peakEnd, 1);
    const baselineStart = addDays(w.preStart, -3);
    const baselineEnd = addDays(w.preStart, -1);
    const q = (sql: string, params: unknown[]) => this.dataSource.query(sql, params);

    // DATE columns compare to IST calendar strings; timestamptz columns use
    // the UTC instants bounding those IST days.
    const [chem, treat, wq, feed, sampling, harvest, ticks] = await Promise.all([
      q(
        `SELECT crop_id AS "cropId", bool_or(alkalinity_ppm IS NOT NULL) AS "alk"
           FROM chemical_data
          WHERE crop_id = ANY($1::uuid[]) AND measurement_date BETWEEN $2 AND $3
          GROUP BY crop_id`,
        [cropIds, w.preStart, w.peakEnd],
      ),
      q(
        `SELECT DISTINCT crop_id AS "cropId" FROM treatments
          WHERE crop_id = ANY($1::uuid[]) AND treatment_date BETWEEN $2 AND $3`,
        [cropIds, w.preStart, w.peakEnd],
      ),
      q(
        `SELECT pond_id AS "pondId",
                bool_or(alkalinity IS NOT NULL) AS "alk",
                bool_or(dissolved_oxygen IS NOT NULL AND recorded_at >= $4) AS "peakDo"
           FROM water_quality_records
          WHERE pond_id = ANY($1::uuid[]) AND recorded_at BETWEEN $2 AND $3
          GROUP BY pond_id`,
        [
          pondIds,
          istDayRangeUtc(w.preStart).start,
          istDayRangeUtc(w.peakEnd).end,
          istDayRangeUtc(w.peakStart).start,
        ],
      ),
      q(
        `SELECT pond_id AS "pondId",
                to_char((recorded_at AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS "day",
                SUM(quantity_kg)::float AS "kg"
           FROM feed_records
          WHERE pond_id = ANY($1::uuid[]) AND recorded_at BETWEEN $2 AND $3
          GROUP BY 1, 2`,
        [pondIds, istDayRangeUtc(baselineStart).start, istDayRangeUtc(w.peakEnd).end],
      ),
      q(
        `SELECT pond_id AS "pondId",
                bool_or(sampling_date <= $3) AS "inPeak",
                bool_or(sampling_date >= $4) AS "inPost"
           FROM sampling_data
          WHERE pond_id = ANY($1::uuid[]) AND sampling_date BETWEEN $2 AND $5
          GROUP BY pond_id`,
        [pondIds, w.peakStart, w.peakEnd, postStart, w.postEnd],
      ),
      q(
        `SELECT DISTINCT crop_id AS "cropId" FROM harvests
          WHERE crop_id = ANY($1::uuid[]) AND harvest_date BETWEEN $2 AND $3`,
        [cropIds, w.peakStart, w.peakEnd],
      ),
      this.actions.find({ where: { pondId: In(pondIds), windowKey: w.key } }),
    ]);

    const chemBy = new Map<string, any>(chem.map((r: any) => [r.cropId, r]));
    const treated = new Set<string>(treat.map((r: any) => r.cropId));
    const wqBy = new Map<string, any>(wq.map((r: any) => [r.pondId, r]));
    const sampBy = new Map<string, any>(sampling.map((r: any) => [r.pondId, r]));
    const harvested = new Set<string>(harvest.map((r: any) => r.cropId));

    const evidence = new Map<string, MoltEvidence>();
    for (const r of refs) {
      const cid = r.cropId as string;
      const days = feed.filter((f: any) => f.pondId === r.pondId);
      const base = days.filter((f: any) => f.day >= baselineStart && f.day <= baselineEnd);
      const peak = days.filter((f: any) => f.day >= w.peakStart && f.day <= w.peakEnd);
      evidence.set(r.pondId, {
        minerals: chemBy.has(cid) || treated.has(cid),
        alkalinity: !!chemBy.get(cid)?.alk || !!wqBy.get(r.pondId)?.alk,
        peakDo: !!wqBy.get(r.pondId)?.peakDo,
        handlingInPeak: !!sampBy.get(r.pondId)?.inPeak || harvested.has(cid),
        postSampling: !!sampBy.get(r.pondId)?.inPost,
        // ponytail: mean over the LOGGED baseline days, so a missed log day
        // does not halve the baseline and fake a cut.
        feedBaselineKg: base.length
          ? base.reduce((s: number, f: any) => s + Number(f.kg), 0) / base.length
          : null,
        peakFeedDaysKg: peak.map((f: any) => Number(f.kg)),
      });
    }

    const manual = new Map<string, Set<string>>();
    for (const t of ticks) {
      if (!manual.has(t.pondId)) manual.set(t.pondId, new Set());
      manual.get(t.pondId)!.add(t.actionKey);
    }
    return { evidence, manual };
  }

  /** Latest sampled ABW per crop (same rule as pond-context: newest sampling). */
  private async latestAbw(cropIds: string[]): Promise<Map<string, number | null>> {
    if (cropIds.length === 0) return new Map();
    const rows = await this.dataSource.query(
      `SELECT DISTINCT ON (crop_id) crop_id AS "cropId", mbw_g AS "mbwG"
         FROM sampling_data
        WHERE crop_id = ANY($1::uuid[])
        ORDER BY crop_id, sampling_date DESC`,
      [cropIds],
    );
    return new Map(
      rows.map((r: any) => [r.cropId, r.mbwG != null ? Number(r.mbwG) : null]),
    );
  }

  async forPond(pondId: string, userId: string, now = new Date()): Promise<PondMolt> {
    const pond = await this.farmAccess.assertCanAccessPond(userId, pondId, 'READ');
    return this.checklistForPond(pond, now);
  }

  private async checklistForPond(pond: Pond, now: Date): Promise<PondMolt> {
    const cropId = pond.activeCycleId ?? null;
    const abw = cropId ? ((await this.latestAbw([cropId])).get(cropId) ?? null) : null;
    const map = await this.checklistsFor([{ pondId: pond.id, cropId, abwG: abw }], now);
    return map.get(pond.id)!;
  }

  /** Every readable active pond with its checklist progress (Lunar screen list). */
  async forUser(userId: string, now = new Date()) {
    const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
    const scoped = await Promise.all(
      farmIds.map((f) => this.farmAccess.getAccessiblePondIds(userId, f, 'READ')),
    );
    const ids = [...new Set(scoped.flat())];
    if (ids.length === 0) return [];
    const ponds = await this.ponds.find({
      where: { id: In(ids), activeCycleId: Not(IsNull()) },
    });
    const abw = await this.latestAbw(ponds.map((p) => p.activeCycleId as string));
    const map = await this.checklistsFor(
      ponds.map((p) => ({
        pondId: p.id,
        cropId: p.activeCycleId as string,
        abwG: abw.get(p.activeCycleId as string) ?? null,
      })),
      now,
    );
    return ponds.map((p) => {
      const pm = map.get(p.id)!;
      return {
        pondId: p.id,
        pondName: p.displayName || p.name,
        farmId: p.farmId,
        eligible: pm.eligible,
        sizeUnknown: pm.sizeUnknown,
        abwG: pm.abwG,
        done: pm.items.filter((i) => i.status === 'done').length,
        total: pm.items.length,
        pendingCritical: pm.pendingCritical,
        needsAction: moltAlertFor(pm) !== null,
      };
    });
  }

  /** Tick / un-tick a MANUAL item on the CURRENT window. */
  async setAction(
    pondId: string,
    userId: string,
    body: { windowKey: string; actionKey: string; done: boolean },
    now = new Date(),
  ): Promise<PondMolt> {
    const pond = await this.farmAccess.assertCanAccessPond(userId, pondId, 'WRITE_OPERATIONAL');
    const pm = await this.checklistForPond(pond, now);
    if (!pm.window || pm.window.key !== body.windowKey) {
      throw new BadRequestException('windowKey is not the current molt window');
    }
    const item = pm.items.find((i) => i.key === body.actionKey);
    if (!item || item.source !== 'manual') {
      throw new BadRequestException('actionKey is not a manual item for this pond');
    }
    if (body.done) {
      await this.actions
        .createQueryBuilder()
        .insert()
        .values({ pondId, windowKey: body.windowKey, actionKey: body.actionKey, doneBy: userId })
        .orIgnore()
        .execute();
    } else {
      await this.actions.delete({ pondId, windowKey: body.windowKey, actionKey: body.actionKey });
    }
    item.status = body.done ? 'done' : 'pending';
    pm.pendingCritical = pm.items.filter(
      (i) => i.priority === 'critical' && i.status !== 'done',
    ).length;
    return pm;
  }
}
