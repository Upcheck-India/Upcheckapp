import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { MoltAction } from './molt-action.entity';
import { Pond } from '../ponds/pond.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { istDayRangeUtc, toIstDateString } from '../common/ist-date';
import { isMissingSchema } from '../health-observations/health.constants';
import {
  MoltPhase,
  MoltWindow,
  addDays,
  currentMoltWindow,
  upcomingWindows,
} from './molt-window';

export type MoltPriority = 'critical' | 'important' | 'routine';
/** `missed` = never done and its days are over (spec 2026-09-14-attendance-and-molt-fixes Q1). */
export type MoltItemStatus = 'done' | 'pending' | 'violated' | 'missed';
export type MoltRoute = 'TreatmentLog' | 'WaterQualityLog' | 'FeedLog' | 'SamplingLog';

export interface MoltItem {
  key: string;
  phase: Exclude<MoltPhase, 'inter'>;
  priority: MoltPriority;
  status: MoltItemStatus;
  source: 'auto' | 'manual';
  route?: MoltRoute;
  /** IST `YYYY-MM-DD` days in which the item can still be acted on (spec A.4). */
  actionableFrom: string;
  actionableUntil: string;
  /** today ∈ [actionableFrom, actionableUntil]. */
  actionable: boolean;
}

/** Lets a client tick or route an alert's items without another fetch. */
export interface MoltAlertActions {
  pondId: string;
  windowKey: string;
  items: { key: string; source: 'auto' | 'manual'; route: string | null }[];
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
  /** A mineral treatment logged pre..peak end (tests do not count). */
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
  /** Daily feed totals (kg) for each logged post day. */
  postFeedDaysKg: number[];
  /** A soft-shell health observation (any level, any source) in post (D6 / M2). Absent = false. */
  softShellChecked?: boolean;
}

/**
 * Does a free-text treatment look like a mineral / lime dose? (M1.1)
 *
 * ponytail: keyword match — replace with a treatment type field when Disease (area 5) adds one.
 * Disease spec §D2 adds `treatments.category`; then `category IN ('mineral','lime_alkalinity')`
 * decides, and this stays only as the fallback for old free-text rows.
 *
 * Symbols / formulas are case-sensitive (Ca, Mg, K, KCl, MgSO4, CaCO3 …) so
 * "can" or "calm" do not match; words are case-insensitive. Indic scripts have
 * no \b in JS regex, so those are plain substrings.
 */
const MINERAL_SYMBOLS = /\b(?:Ca|Mg|K)(?:[A-Z][a-z]?\d*)*\b/;
const MINERAL_WORDS = /\b(?:mineral|calcium|magnesium|potassium|potash|mop|muriate|dolomite|lime|chuna)/i;
const MINERAL_SCRIPT_WORDS = [
  // hi: mineral, calcium, magnesium, potassium/potash, lime, dolomite
  'खनिज', 'कैल्शियम', 'मैग्नीशियम', 'मैग्नेशियम', 'पोटेशियम', 'पोटैशियम', 'पोटाश', 'चूना', 'डोलोमाइट',
  // bn
  'খনিজ', 'ক্যালসিয়াম', 'ম্যাগনেসিয়াম', 'পটাশিয়াম', 'পটাশ', 'চুন', 'ডলোমাইট',
  // ta
  'தாது', 'கனிம', 'கால்சியம்', 'மெக்னீசியம்', 'பொட்டாசியம்', 'சுண்ணாம்பு', 'டோலமைட்',
  // te
  'ఖనిజ', 'కాల్షియం', 'మెగ్నీషియం', 'పొటాషియం', 'పొటాష్', 'సున్నం', 'డోలమైట్',
  // or
  'ଖଣିଜ', 'କ୍ୟାଲସିୟମ', 'ମ୍ୟାଗ୍ନେସିୟମ', 'ପୋଟାସିୟମ', 'ପୋଟାସ', 'ଚୂନ', 'ଡୋଲୋମାଇଟ',
];
export const isMineralTreatment = (t: { description?: string | null; notes?: string | null }): boolean => {
  const text = `${t.description ?? ''} ${t.notes ?? ''}`
    // Potassium permanganate is a disinfectant, not a mineral dose.
    .replace(/potassium\s+permanganate|KMnO4?/gi, '');
  return (
    MINERAL_SYMBOLS.test(text) ||
    MINERAL_WORDS.test(text) ||
    MINERAL_SCRIPT_WORDS.some((w) => text.includes(w))
  );
};

/** Below this ABW molting is not lunar-locked, so no window checklist. */
export const MOLT_MIN_ABW_G = 5;
const FEED_CUT_RATIO = 0.85;

interface ItemDef {
  key: string;
  phase: Exclude<MoltPhase, 'inter'>;
  priority: MoltPriority;
  manual?: true;
  route?: MoltRoute;
  /** Still worth doing until peak end, not just its own phase's end (spec A.4). */
  untilPeakEnd?: true;
  /** English step text for the alert-center briefing (sibling-engine convention). */
  text: string;
}

export const MOLT_ITEMS: ItemDef[] = [
  // Auto from a mineral treatment log; manual tick also allowed (M1.1).
  { key: 'minerals', phase: 'pre', priority: 'important', manual: true, route: 'TreatmentLog', untilPeakEnd: true, text: 'Dose minerals (Ca/Mg/K) and log it' },
  { key: 'alkalinity_check', phase: 'pre', priority: 'important', route: 'WaterQualityLog', untilPeakEnd: true, text: 'Check and log alkalinity (target ≥120 ppm)' },
  { key: 'aerator_service', phase: 'pre', priority: 'routine', manual: true, text: 'Service aerators before the peak' },
  { key: 'feed_cut', phase: 'peak', priority: 'critical', route: 'FeedLog', text: 'Cut feed 15–30% today (molt peak)' },
  { key: 'no_handling', phase: 'peak', priority: 'critical', text: 'No sampling, netting or harvest during the peak' },
  { key: 'night_do_check', phase: 'peak', priority: 'critical', route: 'WaterQualityLog', text: 'Check and log night/pre-dawn DO' },
  // Manual tick always allowed; also auto-done from feed logs (Q2).
  { key: 'restore_feed', phase: 'post', priority: 'important', manual: true, text: 'Restore feed as trays clear (+5–10% over 2–3 days)' },
  { key: 'post_sampling', phase: 'post', priority: 'routine', route: 'SamplingLog', text: 'Sample once shells harden' },
  { key: 'soft_shell_check', phase: 'post', priority: 'routine', manual: true, text: 'Check for soft shells and cannibalism' },
];

const PHASE_ORDER: Record<MoltPhase, number> = { pre: 0, peak: 1, post: 2, inter: -1 };
const PRIORITY_ORDER: Record<MoltPriority, number> = { critical: 0, important: 1, routine: 2 };

/** IST days in which an item can still be acted on (spec A.4). */
const actionableRange = (d: ItemDef, w: MoltWindow): [string, string] => {
  const until = d.untilPeakEnd ? w.peakEnd : undefined;
  if (d.phase === 'pre') return [w.preStart, until ?? addDays(w.peakStart, -1)];
  if (d.phase === 'peak') return [w.peakStart, until ?? w.peakEnd];
  return [addDays(w.peakEnd, 1), until ?? w.postEnd];
};

/**
 * Items counted by the alert: can still be acted on today and are not done.
 * `violated` is history, not an action (M1.3): it stays violated but never
 * keeps an alert open — the farmer cannot un-handle a pond.
 */
const isOpen = (i: MoltItem) => i.actionable && i.status === 'pending';

/** English watch step added while handling was logged in the peak (M1.3). */
export const HANDLED_WATCH_TEXT = 'Handled during peak: check for soft-shell deaths for 2 days';

/**
 * Checklist for the current phase and earlier phases of the same window.
 * Earlier items whose days are over and were never done come back `missed`.
 */
export function deriveItems(
  phase: MoltPhase,
  ev: MoltEvidence,
  manualDone: Set<string>,
  today: string,
  w: MoltWindow,
): MoltItem[] {
  return MOLT_ITEMS.filter((d) => PHASE_ORDER[d.phase] <= PHASE_ORDER[phase]).map(
    (d) => {
      const [actionableFrom, actionableUntil] = actionableRange(d, w);
      const item = (status: MoltItemStatus, source: 'auto' | 'manual'): MoltItem => ({
        key: d.key,
        phase: d.phase,
        priority: d.priority,
        status: status === 'pending' && actionableUntil < today ? 'missed' : status,
        source,
        ...(d.route ? { route: d.route } : {}),
        actionableFrom,
        actionableUntil,
        actionable: actionableFrom <= today && today <= actionableUntil,
      });
      const manual = () => item(manualDone.has(d.key) ? 'done' : 'pending', 'manual');
      const auto = (ok: boolean) => item(ok ? 'done' : 'pending', 'auto');

      // Auto + manual items: auto-done from logs, otherwise a manual tick.
      const autoDone: Record<string, () => boolean> = {
        // Any post day's feed beats the busiest peak day; without a peak feed
        // log there is nothing to compare, so manual only.
        restore_feed: () =>
          ev.peakFeedDaysKg.length > 0 &&
          ev.postFeedDaysKg.some((kg) => kg > Math.max(...ev.peakFeedDaysKg)),
        minerals: () => ev.minerals,
        // M2 entry 2: any soft-shell observation in post (the quick tap,
        // sampling, tray) is the check. Manual tick still allowed.
        soft_shell_check: () => !!ev.softShellChecked,
      };
      if (autoDone[d.key]) {
        return !manualDone.has(d.key) && autoDone[d.key]() ? auto(true) : manual();
      }
      if (d.manual) return manual();
      switch (d.key) {
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

/** An i18n key + params for the client (M1.6); keys live in the app's engines.ts. */
export interface TextKey {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * The one alert a pond's molt checklist produces, or null.
 *
 * `title`/`body`/`steps` stay English for old clients; `titleKey`/`bodyKey`/
 * `stepKeys` let a current client render them in the farmer's language.
 */
export function moltAlertFor(
  pm: PondMolt,
): {
  severity: 'critical' | 'watch';
  title: string;
  body: string;
  steps: string[];
  titleKey: TextKey;
  bodyKey: TextKey;
  stepKeys: TextKey[];
  actions: MoltAlertActions;
} | null {
  if (!pm.eligible || !pm.window) return null;
  const open = pm.items
    .filter((i) => isOpen(i) && i.priority !== 'routine')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  if (open.length === 0) return null;
  const n = open.length;
  const pending = `${n} action${n === 1 ? '' : 's'} pending`;
  const critical = pm.phase === 'peak' && open.some((i) => i.priority === 'critical');
  const label =
    pm.phase === 'peak' ? 'Molt peak' : pm.phase === 'pre' ? 'Molt window opening' : 'Post-molt';
  const handled = pm.items.some((i) => i.key === 'no_handling' && i.status === 'violated');
  const stepKeys: TextKey[] = open.map((i) => ({ key: `engines.lunar.item_${i.key}` }));
  if (handled) stepKeys.push({ key: 'engines.lunar.handledWatch' });
  return {
    severity: critical ? 'critical' : 'watch',
    title: `${label} — ${pending}`,
    body: `${pm.window.kind === 'new' ? 'New' : 'Full'} moon ${pm.window.peakDate}`,
    steps: [
      ...open.map((i) => MOLT_ITEMS.find((d) => d.key === i.key)!.text),
      ...(handled ? [HANDLED_WATCH_TEXT] : []),
    ],
    titleKey: { key: `engines.lunar.alertTitle_${pm.phase}`, params: { count: n } },
    bodyKey: {
      key: pm.window.kind === 'new' ? 'engines.lunar.windowNew' : 'engines.lunar.windowFull',
      params: { date: pm.window.peakDate },
    },
    stepKeys,
    actions: {
      pondId: pm.pondId,
      windowKey: pm.window.key,
      items: open.map((i) => ({ key: i.key, source: i.source, route: i.route ?? null })),
    },
  };
}

const countPendingCritical = (items: MoltItem[]) =>
  items.filter((i) => i.priority === 'critical' && isOpen(i)).length;

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
    const today = toIstDateString(now);
    for (const r of eligible) {
      const pm = out.get(r.pondId)!;
      pm.items = deriveItems(
        phase,
        evidence.get(r.pondId)!,
        manual.get(r.pondId) ?? new Set(),
        today,
        window,
      );
      pm.pendingCritical = countPendingCritical(pm.items);
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
    const [chem, treat, wq, feed, sampling, harvest, ticks, softShell] = await Promise.all([
      q(
        `SELECT crop_id AS "cropId", bool_or(alkalinity_ppm IS NOT NULL) AS "alk"
           FROM chemical_data
          WHERE crop_id = ANY($1::uuid[]) AND measurement_date BETWEEN $2 AND $3
          GROUP BY crop_id`,
        [cropIds, w.preStart, w.peakEnd],
      ),
      q(
        `SELECT crop_id AS "cropId", description, notes FROM treatments
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
        [pondIds, istDayRangeUtc(baselineStart).start, istDayRangeUtc(w.postEnd).end],
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
      // D6: before migration 1780701500000 the table is missing → no evidence.
      q(
        `SELECT DISTINCT pond_id AS "pondId" FROM health_observations
          WHERE pond_id = ANY($1::uuid[]) AND sign = 'soft_shell'
            AND observed_on BETWEEN $2 AND $3`,
        [pondIds, postStart, w.postEnd],
      ).catch((err) => {
        if (isMissingSchema(err)) return [];
        throw err;
      }),
    ]);
    const softShellPonds = new Set<string>(softShell.map((r: any) => r.pondId));

    const chemBy = new Map<string, any>(chem.map((r: any) => [r.cropId, r]));
    const treated = new Set<string>(
      treat.filter((r: any) => isMineralTreatment(r)).map((r: any) => r.cropId),
    );
    const wqBy = new Map<string, any>(wq.map((r: any) => [r.pondId, r]));
    const sampBy = new Map<string, any>(sampling.map((r: any) => [r.pondId, r]));
    const harvested = new Set<string>(harvest.map((r: any) => r.cropId));

    const evidence = new Map<string, MoltEvidence>();
    for (const r of refs) {
      const cid = r.cropId as string;
      const days = feed.filter((f: any) => f.pondId === r.pondId);
      const base = days.filter((f: any) => f.day >= baselineStart && f.day <= baselineEnd);
      const peak = days.filter((f: any) => f.day >= w.peakStart && f.day <= w.peakEnd);
      const post = days.filter((f: any) => f.day >= postStart && f.day <= w.postEnd);
      evidence.set(r.pondId, {
        minerals: treated.has(cid),
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
        postFeedDaysKg: post.map((f: any) => Number(f.kg)),
        softShellChecked: softShellPonds.has(r.pondId),
      });
    }

    const manual = new Map<string, Set<string>>();
    for (const t of ticks) {
      if (!manual.has(t.pondId)) manual.set(t.pondId, new Set());
      manual.get(t.pondId)!.add(t.actionKey);
    }
    return { evidence, manual };
  }

  /**
   * Latest sampled ABW per crop — newest sampling WITH a weight (M1.2), the
   * same rule as pond-context and the daily brief. A count-only sampling must
   * not flip an eligible pond to `sizeUnknown`.
   */
  private async latestAbw(cropIds: string[]): Promise<Map<string, number | null>> {
    if (cropIds.length === 0) return new Map();
    const rows = await this.dataSource.query(
      `SELECT DISTINCT ON (crop_id) crop_id AS "cropId", mbw_g AS "mbwG"
         FROM sampling_data
        WHERE crop_id = ANY($1::uuid[]) AND mbw_g IS NOT NULL
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
      const actionable = pm.items.filter((i) => i.actionable);
      return {
        pondId: p.id,
        pondName: p.displayName || p.name,
        farmId: p.farmId,
        eligible: pm.eligible,
        sizeUnknown: pm.sizeUnknown,
        abwG: pm.abwG,
        done: actionable.filter((i) => i.status === 'done').length,
        total: actionable.length,
        pendingCritical: pm.pendingCritical,
        needsAction: moltAlertFor(pm) !== null,
      };
    });
  }

  /** Tick / un-tick a MANUAL item on the CURRENT window. */
  async setAction(
    pondId: string,
    userId: string,
    body: { id?: string; windowKey: string; actionKey: string; done: boolean },
    now = new Date(),
  ): Promise<PondMolt> {
    const pond = await this.farmAccess.assertCanAccessPond(userId, pondId, 'WRITE_OPERATIONAL');
    const pm = await this.checklistForPond(pond, now);
    // 409, not 400: an offline tick replayed after its window closed is
    // stale, not malformed, and the client's queue treats 409 as done (M1.5).
    if (!pm.window || pm.window.key !== body.windowKey) {
      throw new ConflictException('windowKey is not the current molt window');
    }
    const item = pm.items.find((i) => i.key === body.actionKey);
    const def = MOLT_ITEMS.find((d) => d.key === body.actionKey);
    // restore_feed may already be auto-done from feed logs; a manual tick is still allowed.
    if (!item || (item.source !== 'manual' && !def?.manual)) {
      throw new BadRequestException('actionKey is not a manual item for this pond');
    }
    if (!item.actionable) {
      throw new ConflictException('actionKey can no longer be acted on in this window');
    }
    if (body.done) {
      // Idempotent: a replay hits the (pond, window, action) unique key — or
      // the same client id — and is ignored.
      await this.actions
        .createQueryBuilder()
        .insert()
        .values({
          ...(body.id ? { id: body.id } : {}),
          pondId,
          windowKey: body.windowKey,
          actionKey: body.actionKey,
          doneBy: userId,
        })
        .orIgnore()
        .execute();
    } else {
      await this.actions.delete({ pondId, windowKey: body.windowKey, actionKey: body.actionKey });
    }
    // ponytail: un-ticking an item the feed logs already satisfy shows pending
    // until the next fetch re-derives it.
    item.status = body.done ? 'done' : 'pending';
    item.source = 'manual';
    pm.pendingCritical = countPendingCritical(pm.items);
    return pm;
  }
}
