import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { AvatarService } from '../avatars/avatar.service';
import { DataSource } from 'typeorm';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { roleSatisfies } from '../farm-access/farm-capability';
import { istDayRangeUtc, toIstDateString } from '../common/ist-date';
import { FREE_NH3, Zone, classify, thresholdFor } from '../common/wq-thresholds';
import { MOLT_MIN_ABW_G, MoltItemStatus, MoltService, PondMolt, moltAlertFor } from '../molt/molt.service';
import { addDays, currentMoltWindow } from '../molt/molt-window';
import { computeDoc } from '../crops/crop.entity';
import {
  PondContextService, harvestedPieces, isMissingSchema, partialHarvestSql,
} from '../pond-context/pond-context.service';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';
import { isLowStock } from '../inventory/inventory.constants';
import { DayScoreInput, MinMax, TrayStatus, combineScores, combineValues, computeDayScore, isMortalitySpike } from './day-score';
import {
  BriefTask, DailyBrief, ParamDay, PersonDay, PondDay, PondWork, ReasonCode, Severity, StalePond, StoryItem, StoryTone,
  TimelineEvent, WorkKind,
} from './daily-brief.types';

export const MIN_DATE = '2020-01-01';
/** Days of feed history searched for the "previous 3 logged days" baseline. */
const FEED_LOOKBACK_DAYS = 30;
/** How far back "last logged" looks. Past this a stocked pond counts from stocking. */
const LAST_LOG_LOOKBACK_DAYS = 60;
/** An `ongoing` disease record older than this gets a watch line (spec D6). */
const DISEASE_WATCH_DAYS = 14;
const DONE = ['done', 'verified'];
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000);
const TZ = `'Asia/Kolkata'`;

/** 12:00 IST on an IST day — where DATE-only records sit on the timeline. */
const noonIst = (day: string) => new Date(`${day}T06:30:00.000Z`);
const hhmmIst = (at: Date) => new Date(at.getTime() + 5.5 * 3600_000).toISOString().slice(11, 16);
const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));
const r2 = (n: number) => Math.round(n * 100) / 100;
const TRAY_RANK: Record<TrayStatus, number> = { empty: 0, few_left: 1, a_lot_left: 2 };
const ZONE_RANK: Record<Zone, number> = { optimal: 0, caution: 1, critical: 2 };

type WaterKey = 'do' | 'ph' | 'temperature' | 'salinity' | 'alkalinity' | 'ammonia' | 'nitrite';
/** One water reading, from water_quality_records or chemical_data. */
interface Reading {
  pondId: string;
  day: string;
  at: Date;
  allDay: boolean;
  source: 'water' | 'chemical';
  actorId: string | null;
  v: Partial<Record<WaterKey, number | null>>;
}
const WATER_KEYS: WaterKey[] = ['do', 'ph', 'temperature', 'salinity', 'alkalinity', 'ammonia', 'nitrite'];
const PARAM_REASON: Record<WaterKey, ReasonCode> = {
  do: 'do_low', ph: 'ph_out_of_range', temperature: 'temp_out_of_range', salinity: 'salinity_out_of_range',
  alkalinity: 'alkalinity_out_of_range', ammonia: 'ammonia_high', nitrite: 'nitrite_high',
};
const REASON_PARAM: Partial<Record<ReasonCode, WaterKey>> = {
  ...Object.fromEntries(WATER_KEYS.map((k) => [PARAM_REASON[k], k])),
  ph_swing: 'ph',
};
const TONE_RANK: Record<StoryTone, number> = { critical: 0, watch: 1, good: 2, info: 3 };
const STORY_MAX = 8;
/** Unwatched stocked pond: watch ≥ 2 days no water OR ≥ 3 days no log; critical when either ≥ 7. */
const staleSeverity = (w: number, a: number): Severity | null =>
  w >= 7 || a >= 7 ? 'critical' : w >= 2 || a >= 3 ? 'watch' : null;
/** Display name only — never an email (Addendum 2). */
const USER_NAME_SQL = `coalesce(nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), u.username)`;

export function assertBriefDate(date: string, now = new Date()): void {
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (!valid) throw new BadRequestException('date must be a real YYYY-MM-DD');
  if (date < MIN_DATE) throw new BadRequestException(`date must not be before ${MIN_DATE}`);
  if (date > toIstDateString(now)) throw new BadRequestException('date must not be in the future (IST)');
}

/**
 * `GET /daily-brief` — one IST day across the caller's readable ponds.
 *
 * Fixed query count regardless of pond count: access resolution (≈2–4 per farm
 * in scope, the same per-farm cost as every scoped list), then ~20 set-based
 * reads in one parallel stage, then the molt checklist (≤7, MoltService) alongside
 * one users lookup (names + farm role for everyone who logged, checked in or completed a task).
 * Everything else is pure arithmetic over those rows, day D and D−1 together so
 * previousScore costs no extra round trips.
 */
@Injectable()
export class DailyBriefService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly farmAccess: FarmAccessService,
    private readonly molt: MoltService,
    private readonly pondContext: PondContextService,
    private readonly calc: ShrimpCalculationsService,
    // @Optional so the existing specs need no stub; always present in the app.
    @Optional() private readonly avatars?: AvatarService,
  ) {}

  async get(userId: string, q: { date: string; farmId?: string }, now = new Date()): Promise<DailyBrief> {
    const D = q.date;
    assertBriefDate(D, now);
    const P = addDays(D, -1);
    const today = toIstDateString(now);
    const isToday = D === today;

    // ── access ──
    let farmIds: string[];
    if (q.farmId) {
      // 404 unknown farm, 403 not a member — same as every sibling controller.
      await this.farmAccess.assertCanAccessFarm(userId, q.farmId, 'READ');
      farmIds = [q.farmId];
    } else {
      farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
    }
    const perFarm = await Promise.all(
      farmIds.map(async (farmId) => {
        const [grant, pondIds] = await Promise.all([
          this.farmAccess.getMembershipOnFarm(userId, farmId),
          this.farmAccess.getAccessiblePondIds(userId, farmId, 'READ'),
        ]);
        const can = (c: Parameters<typeof roleSatisfies>[1]) =>
          roleSatisfies(grant.role, c, grant.overrides, grant.policy);
        return {
          farmId,
          pondIds,
          fin: can('VIEW_FINANCIALS'),
          inv: can('VIEW_INVENTORY'),
          mgmt: can('WRITE_MANAGEMENT'),
        };
      }),
    );
    const pondIds = perFarm.flatMap((f) => f.pondIds);
    const canViewFinancials = perFarm.length > 0 && perFarm.every((f) => f.fin);
    const canSeeAttendance = perFarm.length > 0 && perFarm.every((f) => f.mgmt);
    const invFarmIds = perFarm.filter((f) => f.inv).map((f) => f.farmId);

    const dR = istDayRangeUtc(D);
    const pR = istDayRangeUtc(P);
    const q_ = (tag: string, sql: string, params: unknown[]) =>
      this.dataSource.query(`/*daily-brief:${tag}*/ ${sql}`, params) as Promise<any[]>;
    const none = Promise.resolve([] as any[]);
    const hasPonds = pondIds.length > 0;

    // ── one parallel stage of set-based reads ──
    const [
      farms, ponds, wq, chem, feedDays, feedRows, trays, mortDays, mortCum,
      samplings, abwRows, harvests, treatments, tasks, alerts, plans,
      checkIns, members, items, money, lastLogs, harvestPieces,
    ] = await Promise.all([
      farmIds.length ? q_('farms', `SELECT id, name FROM farms WHERE id = ANY($1::uuid[]) ORDER BY name`, [farmIds]) : none,
      hasPonds
        ? q_('ponds',
          `SELECT p.id, p.farm_id, coalesce(nullif(p.display_name, ''), p.name) AS name,
                  coalesce(p.override_area_m2, p.calculated_area_m2)::float AS area,
                  c.id AS crop_id, c.stocking_date::text AS stocking_date, c.initial_age_days,
                  c.stocking_count, c.target_cultivation_days, c.end_day::text AS end_day,
                  coalesce(s.scientific_name, c.species_type) AS species
             FROM ponds p
             LEFT JOIN LATERAL (
                  SELECT c.*, coalesce((c.actual_harvest_date AT TIME ZONE ${TZ})::date,
                           CASE WHEN c.status = 'active' THEN DATE '9999-12-31'
                                ELSE (c.updated_at AT TIME ZONE ${TZ})::date END) AS end_day
                    FROM crops c
                   WHERE c.pond_id = p.id AND c.status <> 'cancelled' AND c.stocking_date <= $2
                   ORDER BY c.stocking_date DESC LIMIT 1
             ) c ON c.end_day >= $3
             LEFT JOIN species s ON s.id = c.species_id
            WHERE p.id = ANY($1::uuid[])
            ORDER BY p.sequence_number NULLS LAST, p.name`,
          [pondIds, D, P])
        : none,
      hasPonds
        ? q_('wq',
          `SELECT pond_id, recorded_at, created_by_id AS actor_id, dissolved_oxygen::float AS "do", ph::float AS ph,
                  temperature::float AS temperature, salinity::float AS salinity,
                  alkalinity::float AS alkalinity, ammonia::float AS ammonia, nitrite::float AS nitrite
             FROM water_quality_records
            WHERE pond_id = ANY($1::uuid[]) AND recorded_at BETWEEN $2 AND $3
            ORDER BY recorded_at`,
          [pondIds, pR.start, dR.end])
        : none,
      hasPonds
        ? q_('chem',
          `SELECT c.pond_id, r.measurement_date::text AS day, r.measurement_time::text AS time, r.created_by_id AS actor_id,
                  r.ammonia_nh3_ppm::float AS ammonia, r.nitrite_no2_ppm::float AS nitrite,
                  r.alkalinity_ppm::float AS alkalinity
             FROM chemical_data r JOIN crops c ON c.id = r.crop_id
            WHERE c.pond_id = ANY($1::uuid[]) AND r.measurement_date BETWEEN $2 AND $3`,
          [pondIds, P, D])
        : none,
      hasPonds
        ? q_('feed_days',
          `SELECT pond_id, to_char((recorded_at AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS day,
                  SUM(quantity_kg)::float AS kg
             FROM feed_records
            WHERE pond_id = ANY($1::uuid[]) AND recorded_at BETWEEN $2 AND $3
            GROUP BY 1, 2`,
          [pondIds, istDayRangeUtc(addDays(D, -FEED_LOOKBACK_DAYS)).start, dR.end])
        : none,
      hasPonds
        ? q_('feed_rows',
          `SELECT pond_id, recorded_at, quantity_kg::float AS kg, feeding_time, created_by_id AS actor_id
             FROM feed_records
            WHERE pond_id = ANY($1::uuid[]) AND recorded_at BETWEEN $2 AND $3
            ORDER BY recorded_at`,
          [pondIds, dR.start, dR.end])
        : none,
      hasPonds
        ? q_('trays',
          `SELECT c.pond_id, r.check_date::text AS day, r.check_time::text AS time,
                  r.tray_number, r.remaining_feed_status AS status, r.created_by_id AS actor_id
             FROM feeding_tray_checks r JOIN crops c ON c.id = r.crop_id
            WHERE c.pond_id = ANY($1::uuid[]) AND r.check_date BETWEEN $2 AND $3`,
          [pondIds, P, D])
        : none,
      hasPonds
        ? q_('mortality_days',
          // Per actor too, so "What we did" can credit who logged it; readers sum qty.
          `SELECT c.pond_id, r.record_date::text AS day, r.created_by_id AS actor_id,
                  SUM(r.quantity)::int AS qty, count(*)::int AS n
             FROM mortality_records r JOIN crops c ON c.id = r.crop_id
            WHERE c.pond_id = ANY($1::uuid[]) AND r.record_date BETWEEN $2 AND $3
            GROUP BY 1, 2, 3`,
          [pondIds, addDays(D, -8), D])
        : none,
      hasPonds
        ? q_('mortality_cum',
          // Same cumulative rule as PondContextService (SUM of estimated_total).
          `SELECT r.crop_id,
                  coalesce(SUM(r.estimated_total) FILTER (WHERE r.record_date <= $2), 0)::float AS d,
                  coalesce(SUM(r.estimated_total) FILTER (WHERE r.record_date <= $3), 0)::float AS p
             FROM mortality_records r JOIN crops c ON c.id = r.crop_id
            WHERE c.pond_id = ANY($1::uuid[])
            GROUP BY r.crop_id`,
          [pondIds, D, P])
        : none,
      hasPonds
        ? q_('samplings',
          `SELECT pond_id, sampling_date::text AS day, mbw_g::float AS mbw, created_by_id AS actor_id
             FROM sampling_data WHERE pond_id = ANY($1::uuid[]) AND sampling_date BETWEEN $2 AND $3`,
          [pondIds, P, D])
        : none,
      hasPonds
        ? q_('abw',
          `SELECT DISTINCT ON (pond_id) pond_id, mbw_g::float AS mbw,
                  (SELECT max(s2.sampling_date)::text FROM sampling_data s2
                    WHERE s2.pond_id = sampling_data.pond_id AND s2.sampling_date < $2) AS prev_sampling
             FROM sampling_data
            WHERE pond_id = ANY($1::uuid[]) AND sampling_date <= $2 AND mbw_g IS NOT NULL
            ORDER BY pond_id, sampling_date DESC`,
          [pondIds, D])
        : none,
      hasPonds
        ? q_('harvests',
          `SELECT c.pond_id, h.harvest_date::text AS day, h.weight_kg::float AS kg, h.created_by_id AS actor_id
             FROM harvests h JOIN crops c ON c.id = h.crop_id
            WHERE c.pond_id = ANY($1::uuid[]) AND h.harvest_date BETWEEN $2 AND $3`,
          [pondIds, P, D])
        : none,
      hasPonds
        ? q_('treatments',
          `SELECT c.pond_id, r.treatment_date::text AS day, r.dosage_kg::float AS kg,
                  r.banned_substance_flag AS flag, r.created_by_id AS actor_id
             FROM treatments r JOIN crops c ON c.id = r.crop_id
            WHERE c.pond_id = ANY($1::uuid[]) AND r.treatment_date BETWEEN $2 AND $3`,
          [pondIds, P, D])
        : none,
      farmIds.length
        ? q_('tasks',
          // Visibility mirrors TasksService.findVisible. Read-only: recurring
          // instances are not materialised here (ponytail: a brief opened before
          // the task list on a template's first day misses that instance).
          `SELECT t.id, t.title, t.status, t.priority, t.due_date::text AS due_date,
                  t.time_window_start::text AS time_window_start, t.pond_id, t.completed_at,
                  coalesce((SELECT array_agg(${USER_NAME_SQL})
                              FROM task_assignees ta JOIN users u ON u.id = ta.user_id
                             WHERE ta.task_id = t.id), '{}') AS assignee_names,
                  coalesce((SELECT array_agg(ta.user_id) FROM task_assignees ta WHERE ta.task_id = t.id), '{}') AS assignee_ids
             FROM tasks t
            WHERE t.farm_id = ANY($1::uuid[]) AND t.is_template = false AND t.status <> 'cancelled'
              AND ((t.scope = 'farm' AND (t.pond_id IS NULL OR t.pond_id = ANY($2::uuid[])))
                   OR (t.scope = 'personal' AND t.created_by_id = $3))
              AND (t.due_date BETWEEN $4 AND $5
                   OR (t.due_date < $5 AND (t.status NOT IN ('done', 'verified') OR t.completed_at >= $6))
                   OR t.completed_at BETWEEN $6 AND $7)
            ORDER BY t.due_date NULLS LAST, t.time_window_start NULLS LAST
            LIMIT 500`,
          [farmIds, pondIds, userId, P, D, dR.start, dR.end])
        : none,
      farmIds.length
        ? q_('alerts',
          `SELECT pond_id, title, severity, type, created_at, updated_at, is_read
             FROM alerts
            WHERE user_id = $1
              AND ((pond_id IS NULL AND farm_id = ANY($2::uuid[])) OR pond_id = ANY($3::uuid[]))
              AND severity IN ('warning', 'critical')
              AND created_at <= $5 AND (is_read = false OR updated_at > $4)
            ORDER BY created_at DESC
            LIMIT 500`,
          [userId, farmIds, pondIds, pR.start, dR.end])
        : none,
      hasPonds
        ? q_('harvest_plans',
          `SELECT pond_id, planned_harvest_date, target_weight_kg::float AS target
             FROM harvest_plans
            WHERE pond_id = ANY($1::uuid[]) AND status = 'planned'
              AND planned_harvest_date BETWEEN $2 AND $3
            ORDER BY planned_harvest_date`,
          [pondIds, dR.start, istDayRangeUtc(addDays(D, 6)).end])
        : none,
      canSeeAttendance
        ? q_('check_ins',
          `SELECT a.user_id, a.check_in_at, a.check_out_at
             FROM attendance_records a
             JOIN farm_members fm ON fm.farm_id = a.farm_id AND fm.user_id = a.user_id
                                  AND fm.status = 'active' AND fm.role <> 'owner'
            WHERE a.farm_id = ANY($1::uuid[]) AND a.check_in_at BETWEEN $2 AND $3
            ORDER BY a.check_in_at`,
          [farmIds, dR.start, dR.end])
        : none,
      canSeeAttendance
        ? q_('members',
          `SELECT count(DISTINCT user_id)::int AS total FROM farm_members
            WHERE farm_id = ANY($1::uuid[]) AND status = 'active' AND role <> 'owner'`,
          [farmIds])
        : none,
      // Stock is a live number — there is no history to read a past day from.
      isToday && invFarmIds.length
        ? q_('inventory',
          `SELECT i.id, i.name, i.quantity::float AS quantity, i.unit, i.reorder_level::float AS reorder_level
             FROM inventory i
            WHERE i.farm_id = ANY($1::uuid[])
               OR i.id IN (SELECT inventory_id FROM inventory_farms WHERE farm_id = ANY($1::uuid[]))
            ORDER BY i.name`,
          [invFarmIds])
        : none,
      canViewFinancials
        ? q_('money',
          `SELECT
             (SELECT coalesce(SUM(amount), 0) FROM transactions
               WHERE farm_id = ANY($1::uuid[]) AND type = 'expense' AND transaction_date BETWEEN $2 AND $3)::float
           + (SELECT coalesce(SUM(e.amount), 0) FROM expenses e JOIN ponds p ON p.id = e.pond_id
               WHERE p.farm_id = ANY($1::uuid[]) AND e.date = $4)::float AS spend,
             (SELECT coalesce(SUM(amount), 0) FROM transactions
               WHERE farm_id = ANY($1::uuid[]) AND type = 'income' AND transaction_date BETWEEN $2 AND $3)::float AS income`,
          [farmIds, dR.start, dR.end, D])
        : none,
      hasPonds
        ? q_('last_log',
          // Bounded to LAST_LOG_LOOKBACK_DAYS before D; nothing in the window ⇒
          // the caller falls back to the stocking date (either way ≥ 7 ⇒ critical).
          `SELECT pond_id,
                  to_char(max(day) FILTER (WHERE kind = 'water'), 'YYYY-MM-DD') AS water,
                  to_char(max(day) FILTER (WHERE kind = 'feed'), 'YYYY-MM-DD') AS feed,
                  to_char(max(day), 'YYYY-MM-DD') AS any_day,
                  -- as of the day before, for what the day started with
                  to_char(max(day) FILTER (WHERE kind = 'water' AND day < $5), 'YYYY-MM-DD') AS water_prev,
                  to_char(max(day) FILTER (WHERE day < $5), 'YYYY-MM-DD') AS any_prev
             FROM (
                  SELECT pond_id, (recorded_at AT TIME ZONE ${TZ})::date AS day, 'water' AS kind
                    FROM water_quality_records WHERE pond_id = ANY($1::uuid[]) AND recorded_at BETWEEN $2 AND $3
                  UNION ALL
                  SELECT pond_id, (recorded_at AT TIME ZONE ${TZ})::date, 'feed'
                    FROM feed_records WHERE pond_id = ANY($1::uuid[]) AND recorded_at BETWEEN $2 AND $3
                  UNION ALL
                  SELECT pond_id, sampling_date, 'other'
                    FROM sampling_data WHERE pond_id = ANY($1::uuid[]) AND sampling_date BETWEEN $4 AND $5
                  UNION ALL
                  ${[
                    ['chemical_data', 'measurement_date'], ['feeding_tray_checks', 'check_date'],
                    ['mortality_records', 'record_date'], ['treatments', 'treatment_date'], ['harvests', 'harvest_date'],
                  ].map(([table, col]) =>
                    `SELECT c.pond_id, r.${col}, 'other' FROM ${table} r JOIN crops c ON c.id = r.crop_id
                      WHERE c.pond_id = ANY($1::uuid[]) AND r.${col} BETWEEN $4 AND $5`).join('\n                  UNION ALL\n                  ')}
             ) t
            GROUP BY pond_id`,
          [pondIds, istDayRangeUtc(addDays(D, -LAST_LOG_LOOKBACK_DAYS)).start, dR.end, addDays(D, -LAST_LOG_LOOKBACK_DAYS), D])
        : none,
      // Same partial-harvest rule as PondContextService (H2). [] until the
      // H1 migration is applied — the brief then counts no harvests, as before.
      hasPonds
        ? q_('harvest_pieces', partialHarvestSql('pond'), [pondIds]).catch((err) => {
          if (!isMissingSchema(err)) throw err;
          return [] as any[];
        })
        : none,
    ]);

    // ── bucket rows by pond + day ──
    const readings: Reading[] = [
      ...wq.map((r: any): Reading => {
        const at = new Date(r.recorded_at);
        return {
          pondId: r.pond_id, day: toIstDateString(at), at, allDay: false, source: 'water', actorId: r.actor_id ?? null,
          v: { do: num(r.do), ph: num(r.ph), temperature: num(r.temperature), salinity: num(r.salinity), alkalinity: num(r.alkalinity), ammonia: num(r.ammonia), nitrite: num(r.nitrite) },
        };
      }),
      ...chem.map((r: any): Reading => ({
        pondId: r.pond_id, day: r.day,
        at: r.time ? new Date(`${r.day}T${r.time.slice(0, 8)}+05:30`) : noonIst(r.day),
        allDay: !r.time, source: 'chemical', actorId: r.actor_id ?? null,
        v: { ammonia: num(r.ammonia), nitrite: num(r.nitrite), alkalinity: num(r.alkalinity) },
      })),
    ].filter((r) => r.day === D || r.day === P);
    readings.sort((a, b) => a.at.getTime() - b.at.getTime());

    const at = <T extends { pond_id: string; day: string }>(rows: T[], pondId: string, day: string) =>
      rows.filter((r) => r.pond_id === pondId && r.day === day);
    const cumByCrop = new Map<string, any>(mortCum.map((r: any) => [r.crop_id, r]));
    const abwByPond = new Map<string, number | null>(abwRows.map((r: any) => [r.pond_id, num(r.mbw)]));
    const feedRowsD = feedRows.filter((r: any) => toIstDateString(new Date(r.recorded_at)) === D);

    // ── molt (checklist for ponds with a cycle on D) ──
    const cycleOn = (p: any, day: string) => !!p.crop_id && p.stocking_date <= day && p.end_day >= day;
    const moltNow = noonIst(D);
    const moltD = currentMoltWindow(moltNow);
    const moltP = currentMoltWindow(noonIst(P));
    const activePonds = ponds.filter((p: any) => cycleOn(p, D));
    // No completer column on tasks: a task is credited to its assignee only when
    // it has exactly one; otherwise nobody (completedByName null).
    const completerOf = (t: any): string | null => (t.assignee_ids?.length === 1 ? t.assignee_ids[0] : null);
    const userIds = [
      ...new Set<string>(
        [wq, chem, feedRows, trays, mortDays, samplings, harvests, treatments]
          .flatMap((rows) => rows.map((r: any) => r.actor_id))
          .concat(checkIns.map((c: any) => c.user_id), tasks.map(completerOf))
          .filter(Boolean),
      ),
    ];
    const [molts, users] = await Promise.all([
      activePonds.length
        ? this.molt.checklistsFor(
            activePonds.map((p: any) => ({ pondId: p.id, cropId: p.crop_id, abwG: abwByPond.get(p.id) ?? null })),
            moltNow,
          )
        : Promise.resolve(new Map<string, PondMolt>()),
      userIds.length
        ? q_('users',
          // Name + highest farm role across the farms in scope. Never the email.
          `SELECT u.id, ${USER_NAME_SQL} AS name,
                  CASE WHEN EXISTS (SELECT 1 FROM farms f WHERE f.user_id = u.id AND f.id = ANY($2::uuid[])) THEN 'owner'
                       ELSE (SELECT fm.role FROM farm_members fm
                              WHERE fm.user_id = u.id AND fm.farm_id = ANY($2::uuid[]) AND fm.status = 'active'
                              ORDER BY array_position(ARRAY['owner', 'manager', 'worker', 'viewer'], fm.role::text)
                              LIMIT 1) END AS role
             FROM users u WHERE u.id = ANY($1::uuid[])`,
          [userIds, farmIds])
        : none,
    ]);
    const userById = new Map<string, any>(users.map((u: any) => [u.id, u]));
    const nameOf = (id: string | null | undefined): string | null => (id ? (userById.get(id)?.name ?? null) : null);
    const actor = (id: string | null | undefined) => ({ actorId: id ?? null, actorName: nameOf(id) });

    // ── per pond ──
    const openAt = (end: Date) => (a: any) =>
      new Date(a.created_at) <= end && (!a.is_read || new Date(a.updated_at) > end);
    const taskDone = (t: any, end: Date) =>
      DONE.includes(t.status) && (!t.completed_at || new Date(t.completed_at) <= end);

    const pondDays: (PondDay & { areaM2: number | null; prevValue: number | null })[] = [];
    const missingLogs: DailyBrief['todo']['missingLogs'] = [];
    const milestones: DailyBrief['happening']['milestones'] = [];
    let worstPrevious: DailyBrief['carriedOver']['worstPrevious'] = null;
    let worstPrevValue = Infinity;
    const stalePonds: StalePond[] = [];
    const staleBefore: { pondId: string; days: number; severity: Severity }[] = [];
    const lastLogByPond = new Map<string, any>(lastLogs.map((r: any) => [r.pond_id, r]));

    for (const p of ponds) {
      const day = (d: string) => {
        const rs = readings.filter((r) => r.pondId === p.id && r.day === d);
        const feedKg = feedDays.filter((f: any) => f.pond_id === p.id && f.day === d).reduce((s: number, f: any) => s + Number(f.kg), 0);
        const feedLogged = feedDays.some((f: any) => f.pond_id === p.id && f.day === d);
        const baseDays = feedDays.filter((f: any) => f.pond_id === p.id && f.day < d).sort((a: any, b: any) => (a.day < b.day ? 1 : -1)).slice(0, 3);
        const prev3 = baseDays.length ? r2(baseDays.reduce((s: number, f: any) => s + Number(f.kg), 0) / baseDays.length) : null;
        const trayRows = at(trays, p.id, d);
        const trayWorst = trayRows.reduce<TrayStatus | null>((w, t: any) => {
          const s = t.status as TrayStatus;
          if (!(s in TRAY_RANK)) return w;
          return w == null || TRAY_RANK[s] > TRAY_RANK[w] ? s : w;
        }, null);
        const mortRows = at(mortDays, p.id, d);
        const mortality = mortRows.length ? mortRows.reduce((s: number, r: any) => s + Number(r.qty), 0) : null;
        const week = mortDays.filter((r: any) => r.pond_id === p.id && r.day >= addDays(d, -7) && r.day < d);
        const mortality7DayAvg = week.length ? r2(week.reduce((s: number, r: any) => s + Number(r.qty), 0) / 7) : null;
        const cum = p.crop_id ? cumByCrop.get(p.crop_id) : null;
        const livePopulation = cycleOn(p, d)
          ? this.pondContext.estimateLivePopulation(
            num(p.stocking_count),
            Number(d === D ? cum?.d : cum?.p) || 0,
            harvestedPieces(harvestPieces, p.crop_id, d)?.pieces ?? 0,
          )
          : null;
        const treat = at(treatments, p.id, d);
        const handling = at(samplings, p.id, d).length + at(harvests, p.id, d).length > 0;
        return { rs, feedKg, feedLogged, prev3, trayRows, trayWorst, mortality, mortality7DayAvg, livePopulation, treat, handling };
      };
      const dd = day(D);
      const pd = day(P);
      const hasLog =
        dd.rs.length + dd.trayRows.length + dd.treat.length > 0 || dd.feedLogged || dd.mortality != null || dd.handling;
      const active = cycleOn(p, D);
      if (!active && !hasLog) continue;

      const species = p.species ?? null;
      const water = this.waterDay(dd.rs, species);
      const scoreFor = (x: typeof dd, d: string, phase: string, end: Date) => {
        const w = x === dd ? water : this.waterDay(x.rs, species);
        // Care counts this pond's own tasks; farm-wide tasks are not one pond's.
        const dueTasks = tasks.filter((t: any) => t.due_date === d && t.pond_id === p.id);
        const input: DayScoreInput = {
          pondId: p.id,
          species,
          water: Object.fromEntries(
            (['do', 'ph', 'temperature', 'salinity', 'alkalinity', 'ammonia', 'freeNh3', 'nitrite'] as const).map((k) => [
              k, w[k] ? ({ min: w[k]!.min, max: w[k]!.max } as MinMax) : null,
            ]),
          ),
          feed: { logged: x.feedLogged, kg: x.feedKg, prev3DayAvgKg: x.prev3, trayWorst: x.trayWorst },
          health: {
            mortality: x.mortality,
            livePopulation: x.livePopulation,
            mortality7DayAvg: x.mortality7DayAvg,
            bannedTreatment: x.treat.some((t: any) => t.flag === 'banned'),
            treatmentLogged: x.treat.length > 0,
            handlingLogged: x.handling,
          },
          moltPhase: phase as DayScoreInput['moltPhase'],
          care: {
            cycleActive: cycleOn(p, d),
            tasksDue: dueTasks.length,
            tasksDone: dueTasks.filter((t: any) => taskDone(t, end)).length,
            criticalAlertOpen: alerts.some((a: any) => a.pond_id === p.id && a.severity === 'critical' && openAt(end)(a)),
          },
        };
        return computeDayScore(input);
      };
      // A score rates a crop. A pond with no cycle that day (empty, drying,
      // being prepared) still shows its readings, but one water test there
      // scored 100 and lifted the farm score in production data.
      // The peak exemptions (feed cut, handling) apply only to a pond whose
      // shrimp molt with the moon (M1.4): same ABW gate as the checklist.
      const moltEligible = (abwByPond.get(p.id) ?? -1) >= MOLT_MIN_ABW_G;
      const moltPhaseOf = (ph: string) => (moltEligible ? ph : 'inter');
      const score = active ? scoreFor(dd, D, moltPhaseOf(moltD.phase), dR.end) : null;
      const prevScore = cycleOn(p, P) ? scoreFor(pd, P, moltPhaseOf(moltP.phase), pR.end) : null;
      if (prevScore && prevScore.reasons.length && prevScore.value < worstPrevValue) {
        worstPrevValue = prevScore.value;
        worstPrevious = { pondId: p.id, reason: prevScore.reasons[0] };
      }

      const doc = active ? computeDoc(p.stocking_date, Number(p.initial_age_days) || 0, noonIst(D)) : null;
      if (doc != null) {
        for (const m of [30, 60, 90] as const) if (doc === m) milestones.push({ pondId: p.id, doc, kind: `doc_${m}` });
        if (p.target_cultivation_days != null && doc === Number(p.target_cultivation_days)) {
          milestones.push({ pondId: p.id, doc, kind: 'target_days' });
        }
      }
      if (active) {
        const kinds: ('water' | 'feed' | 'tray' | 'mortality')[] = [];
        if (!dd.rs.length) kinds.push('water');
        if (!dd.feedLogged) kinds.push('feed');
        if (!dd.trayRows.length) kinds.push('tray');
        if (dd.mortality == null) kinds.push('mortality');
        if (kinds.length) missingLogs.push({ pondId: p.id, kinds });
      }

      // A stocked pond counts from its stocking date when never logged — or when
      // its last log predates stocking (pond prep, previous cycle).
      const ll = lastLogByPond.get(p.id);
      const since = (date: string | null) => {
        const from = active && (!date || date < p.stocking_date) ? p.stocking_date : date;
        return from ? Math.max(0, daysBetween(from, D)) : null;
      };
      const lastLog = {
        waterDate: ll?.water ?? null,
        feedDate: ll?.feed ?? null,
        anyDate: ll?.any_day ?? null,
        daysSinceWater: since(ll?.water ?? null),
        daysSinceFeed: since(ll?.feed ?? null),
        daysSinceAny: since(ll?.any_day ?? null),
      };
      if (active) {
        const severity = staleSeverity(lastLog.daysSinceWater ?? 0, lastLog.daysSinceAny ?? 0);
        if (severity) stalePonds.push({ pondId: p.id, daysSinceWater: lastLog.daysSinceWater, daysSinceAny: lastLog.daysSinceAny, severity });
      }
      // The same rule as of the day before — what this day started with.
      if (cycleOn(p, P)) {
        const sinceP = (date: string | null) => Math.max(0, daysBetween(!date || date < p.stocking_date ? p.stocking_date : date, P));
        const w = sinceP(ll?.water_prev ?? null);
        const a = sinceP(ll?.any_prev ?? null);
        const severity = staleSeverity(w, a);
        if (severity) staleBefore.push({ pondId: p.id, days: Math.max(w, a), severity });
      }

      const abwG = abwByPond.get(p.id) ?? null;
      const pm = molts.get(p.id);
      pondDays.push({
        pondId: p.id,
        name: p.name,
        farmId: p.farm_id,
        cycleActive: active,
        doc,
        score,
        previousScore: prevScore?.value ?? null,
        water,
        feed: {
          kg: r2(dd.feedKg),
          prev3DayAvgKg: dd.prev3,
          sessions: feedRowsD
            .filter((f: any) => f.pond_id === p.id)
            .map((f: any) => f.feeding_time || hhmmIst(new Date(f.recorded_at))),
          trayWorst: dd.trayWorst,
        },
        health: {
          mortality: dd.mortality,
          mortalityPct:
            dd.mortality != null && dd.livePopulation ? r2((dd.mortality / dd.livePopulation) * 100) : null,
          mortality7DayAvg: dd.mortality7DayAvg,
          abwG,
          biomassKg: active ? this.pondContext.biomass(dd.livePopulation, abwG) : null,
          livePopulation: dd.livePopulation,
          treatments: dd.treat.length,
        },
        molt: pm?.eligible ? { phase: pm.phase, pendingCritical: pm.pendingCritical } : null,
        lastLog,
        areaM2: num(p.area),
        prevValue: prevScore?.value ?? null,
      });
    }

    // ── farm roll-up ──
    const { score, weakestPondId } = combineScores(pondDays.map((p) => ({ pondId: p.pondId, areaM2: p.areaM2, score: p.score })));
    const previousScore = combineValues(pondDays.map((p) => ({ areaM2: p.areaM2, value: p.prevValue })));
    const bandCount = (b: string) => pondDays.filter((p) => p.score?.band === b).length;
    const stocked = pondDays.filter((p) => p.cycleActive);
    const stockedPonds = stocked.length;
    const scoredStockedPonds = stocked.filter((p) => p.score).length;
    const worstDays = (s: StalePond) => Math.max(s.daysSinceWater ?? 0, s.daysSinceAny ?? 0);
    stalePonds.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1) || worstDays(b) - worstDays(a));

    // ── tasks ──
    const pondSet = new Set(pondIds);
    const toTask = (t: any): BriefTask => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority ?? null,
      dueDate: t.due_date ?? null,
      timeWindowStart: t.time_window_start ? String(t.time_window_start).slice(0, 5) : null,
      pondId: t.pond_id ?? null,
      assigneeNames: (t.assignee_names ?? []).filter(Boolean),
    });
    const visibleTasks = tasks.filter((t: any) => !t.pond_id || pondSet.has(t.pond_id));

    // ── timeline ──
    const timeline: TimelineEvent[] = [];
    /** The day's logged work, one row per timeline log event (feeds "What we did"). */
    const work: { kind: WorkKind; pondId: string; actorId: string | null; n: number; kg: number; g: number | null; at: string }[] = [];
    const push = (e: TimelineEvent, w?: { n?: number; kg?: number; g?: number | null }) => {
      timeline.push(e);
      if (w && e.pondId) work.push({ kind: e.kind as WorkKind, pondId: e.pondId, actorId: e.actorId ?? null, n: w.n ?? 1, kg: w.kg ?? 0, g: w.g ?? null, at: e.at });
    };
    const dayOnly = (day: string) => ({ at: noonIst(day).toISOString(), allDay: true });
    const fmt = (n: number | null | undefined) => (n == null ? null : String(r2(n)));
    for (const r of readings.filter((x) => x.day === D)) {
      const sp = ponds.find((p: any) => p.id === r.pondId)?.species ?? null;
      const zones: Zone[] = [];
      if (r.v.do != null) zones.push(classify(r.v.do, thresholdFor(sp, 'do')));
      if (r.v.ph != null) zones.push(classify(r.v.ph, thresholdFor(sp, 'ph')));
      if (r.v.ammonia != null) zones.push(classify(r.v.ammonia, thresholdFor(sp, 'ammonia')));
      const worst = zones.reduce<Zone>((w, z) => (ZONE_RANK[z] > ZONE_RANK[w] ? z : w), 'optimal');
      const parts =
        r.source === 'water'
          ? [
              r.v.do != null && `DO ${fmt(r.v.do)}`,
              r.v.ph != null && `pH ${fmt(r.v.ph)}`,
              r.v.temperature != null && `${fmt(r.v.temperature)} °C`,
              r.v.salinity != null && `${fmt(r.v.salinity)} ppt`,
              r.v.ammonia != null && `NH₃ ${fmt(r.v.ammonia)}`,
            ]
          : [
              r.v.ammonia != null && `NH₃ ${fmt(r.v.ammonia)}`,
              r.v.nitrite != null && `NO₂ ${fmt(r.v.nitrite)}`,
              r.v.alkalinity != null && `ALK ${fmt(r.v.alkalinity)}`,
            ];
      push({
        at: r.at.toISOString(),
        allDay: r.allDay,
        kind: r.source,
        pondId: r.pondId,
        ...(worst !== 'optimal' ? { severity: (worst === 'critical' ? 'critical' : 'watch') as Severity } : {}),
        summary: parts.filter(Boolean).join(' · '),
        ...actor(r.actorId),
      }, {});
    }
    for (const f of feedRowsD) push({ at: new Date(f.recorded_at).toISOString(), allDay: false, kind: 'feed', pondId: f.pond_id, summary: `${fmt(num(f.kg))} kg`, ...actor(f.actor_id) }, { kg: Number(f.kg) || 0 });
    for (const t of trays.filter((x: any) => x.day === D)) {
      push({
        ...(t.time ? { at: new Date(`${D}T${t.time.slice(0, 8)}+05:30`).toISOString(), allDay: false } : dayOnly(D)),
        kind: 'tray', pondId: t.pond_id,
        ...(t.status === 'a_lot_left' ? { severity: 'watch' as Severity } : {}),
        summary: `#${t.tray_number}`,
        ...actor(t.actor_id),
      }, {});
    }
    for (const m of mortDays.filter((x: any) => x.day === D)) push({ ...dayOnly(D), kind: 'mortality', pondId: m.pond_id, summary: `×${m.qty}`, ...actor(m.actor_id) }, { n: Number(m.n) || 1 });
    for (const s of samplings.filter((x: any) => x.day === D)) push({ ...dayOnly(D), kind: 'sampling', pondId: s.pond_id, summary: s.mbw != null ? `${fmt(num(s.mbw))} g` : '', ...actor(s.actor_id) }, { g: num(s.mbw) });
    for (const h of harvests.filter((x: any) => x.day === D)) push({ ...dayOnly(D), kind: 'harvest', pondId: h.pond_id, summary: `${fmt(num(h.kg))} kg`, ...actor(h.actor_id) }, { kg: Number(h.kg) || 0 });
    for (const t of treatments.filter((x: any) => x.day === D)) {
      push({
        ...dayOnly(D), kind: 'treatment', pondId: t.pond_id,
        ...(t.flag === 'banned' ? { severity: 'critical' as Severity } : t.flag === 'restricted' ? { severity: 'watch' as Severity } : {}),
        summary: t.kg != null ? `${fmt(num(t.kg))} kg` : '',
        ...actor(t.actor_id),
      }, {});
    }
    for (const a of alerts) {
      const created = new Date(a.created_at);
      if (created < dR.start || created > dR.end) continue;
      push({ at: created.toISOString(), allDay: false, kind: 'alert', pondId: a.pond_id ?? null, severity: a.severity === 'critical' ? 'critical' : 'watch', summary: a.type, ...actor(null) });
    }
    const inDay = (v: unknown) => v != null && new Date(v as string) >= dR.start && new Date(v as string) <= dR.end;
    const completedOnD = visibleTasks.filter((t: any) => inDay(t.completed_at));
    for (const t of completedOnD) push({ at: new Date(t.completed_at).toISOString(), allDay: false, kind: 'task_done', pondId: t.pond_id ?? null, summary: t.title, ...actor(completerOf(t)) });
    for (const c of checkIns) push({ at: new Date(c.check_in_at).toISOString(), allDay: false, kind: 'check_in', pondId: null, summary: hhmmIst(new Date(c.check_in_at)), ...actor(c.user_id) });
    timeline.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

    // ── what we did ──
    const add = (counts: Partial<Record<WorkKind, number>>, kind: WorkKind, n: number) => { counts[kind] = (counts[kind] ?? 0) + n; };
    const people = new Map<string, PersonDay>();
    const person = (id: string): PersonDay => {
      let p = people.get(id);
      if (!p) {
        const u = userById.get(id);
        p = { userId: id, name: u?.name ?? '', role: u?.role ?? null, shift: null, counts: {}, feedKg: 0, pondIds: [], tasksDone: 0 };
        people.set(id, p);
      }
      return p;
    };
    const pondWork = new Map<string, PondWork>();
    for (const w of work) {
      let pw = pondWork.get(w.pondId);
      if (!pw) pondWork.set(w.pondId, (pw = { pondId: w.pondId, counts: {}, feedKg: 0, feedRounds: 0, samplingG: null, harvestKg: null, people: [] }));
      add(pw.counts, w.kind, w.n);
      if (w.kind === 'feed') { pw.feedKg += w.kg; pw.feedRounds += 1; }
      if (w.kind === 'sampling' && w.g != null) pw.samplingG = r2(w.g);
      if (w.kind === 'harvest') pw.harvestKg = r2((pw.harvestKg ?? 0) + w.kg);
      const name = nameOf(w.actorId);
      if (name && !pw.people.includes(name)) pw.people.push(name);
      if (!w.actorId) continue;
      const p = person(w.actorId);
      add(p.counts, w.kind, w.n);
      if (w.kind === 'feed') p.feedKg += w.kg;
      if (!p.pondIds.includes(w.pondId)) p.pondIds.push(w.pondId);
    }
    for (const t of completedOnD) {
      const id = completerOf(t);
      if (id) person(id).tasksDone += 1;
    }
    if (canSeeAttendance) {
      for (const c of checkIns) person(c.user_id);
      for (const p of people.values()) {
        const mine = checkIns.filter((c: any) => c.user_id === p.userId);
        const closed = mine.filter((c: any) => c.check_out_at);
        const iso = (v: any) => new Date(v).toISOString();
        p.shift = {
          checkIn: mine.length ? iso(mine[0].check_in_at) : null,
          // Still checked in on any session ⇒ no check-out yet.
          checkOut: mine.length && closed.length === mine.length ? closed.map((c: any) => iso(c.check_out_at)).sort().pop()! : null,
          hours: closed.length
            ? Math.round(closed.reduce((s: number, c: any) => s + (Date.parse(c.check_out_at) - Date.parse(c.check_in_at)), 0) / 360_000) / 10
            : null,
        };
      }
    }
    const effort = (p: PersonDay) => Object.values(p.counts).reduce((s, n) => s + (n ?? 0), 0) + p.tasksDone;
    const done: DailyBrief['done'] = {
      people: [...people.values()].map((p) => ({ ...p, feedKg: r2(p.feedKg) })).sort((a, b) => effort(b) - effort(a)),
      ponds: [...pondWork.values()].map((p) => ({ ...p, feedKg: r2(p.feedKg) })),
      tasksDone: completedOnD.map((t: any) => ({
        id: t.id, title: t.title, pondId: t.pond_id ?? null,
        completedAt: new Date(t.completed_at).toISOString(), completedByName: nameOf(completerOf(t)),
      })),
    };
    // Pictures for the people rows: privacy + shared-farm checked server side.
    const pics = await this.avatars?.resolve(userId, farmIds, done.people.map((p) => p.userId));
    if (pics) {
      done.people = done.people.map((p) => ({ ...p, avatarThumbUrl: pics.get(p.userId)?.avatarThumbUrl ?? null }));
    }

    // ── molt roll-up ──
    const moltList = [...molts.values()];
    const moltWindow = moltD.window ?? moltD.next;
    const moltItems: DailyBrief['todo']['moltItems'] = [];
    const moltPending: DailyBrief['carriedOver']['moltPending'] = [];
    for (const pm of moltList) {
      if (!pm.eligible) continue;
      // Only items that can still be acted on today (spec
      // 2026-09-14-attendance-and-molt-fixes A.4): past items are "missed",
      // not to-dos, but minerals stay open through the peak.
      const current = pm.items.filter((i) => i.actionable);
      for (const i of current) moltItems.push({ pondId: pm.pondId, key: i.key, priority: i.priority, status: i.status as Exclude<MoltItemStatus, 'missed'>, route: i.route ?? null });
      const keys = current.filter((i) => i.status !== 'done' && i.priority !== 'routine').map((i) => i.key);
      if (keys.length) moltPending.push({ pondId: pm.pondId, keys });
    }

    const dayOf = (rows: any[], d: string) => rows.filter((r) => r.day === d);
    const sum = (rows: any[], key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    // Totals cover exactly the ponds listed, so the numbers add up on screen.
    const listed = new Set(pondDays.map((p) => p.pondId));
    const inListed = (rows: any[]) => rows.filter((r) => listed.has(r.pond_id));
    const feedP = inListed(dayOf(feedDays, P));
    const mortP = inListed(dayOf(mortDays, P));
    const readingsD = readings.filter((r) => r.day === D);
    const moltHappening: DailyBrief['happening']['molt'] = activePonds.length
      ? {
          phase: moltD.phase,
          peakDate: moltWindow?.peakDate ?? null,
          preStart: moltWindow?.preStart ?? null,
          postEnd: moltWindow?.postEnd ?? null,
          pondsWithPending: moltList.filter((m) => moltAlertFor(m) !== null).length,
        }
      : null;
    const openAtStart = alerts.filter(openAt(dR.start));
    const overdue = visibleTasks.filter((t: any) => t.due_date && t.due_date < D && !taskDone(t, dR.start));
    const present = new Set(checkIns.map((c: any) => c.user_id)).size;

    // ── the day's story (Addendum 2) ──
    const story: StoryItem[] = [];
    const speciesOf = new Map<string, string | null>(ponds.map((p: any) => [p.id, p.species ?? null]));
    const zoneOf = (r: Reading, k: WaterKey) => classify(r.v[k] as number, thresholdFor(speciesOf.get(r.pondId), k));
    const sevTone = (z: Zone): Severity => (z === 'critical' ? 'critical' : 'watch');
    // Issues: per pond+parameter, the worst reading; resolved when every later reading is optimal.
    const issues: (StoryItem & { rank: number })[] = [];
    for (const pondId of listed) {
      for (const k of WATER_KEYS) {
        const rs = readingsD.filter((r) => r.pondId === pondId && r.v[k] != null);
        let w: Reading | null = null;
        let worstZone: Zone = 'optimal';
        let lastBad = -1;
        for (let i = 0; i < rs.length; i++) {
          const z = zoneOf(rs[i], k);
          if (z === 'optimal') continue;
          lastBad = i;
          if (ZONE_RANK[z] > ZONE_RANK[worstZone]) { w = rs[i]; worstZone = z; }
        }
        if (!w) continue;
        const resolved = rs[lastBad + 1] ?? null;
        const reason = { code: PARAM_REASON[k], severity: sevTone(worstZone), pondId, value: r2(w.v[k] as number) };
        issues.push({
          code: resolved ? 'issue_resolved' : 'issue_open',
          tone: resolved ? 'good' : sevTone(worstZone),
          pondId, reason, at: w.at.toISOString(), resolvedAt: resolved?.at.toISOString() ?? null,
          personName: nameOf(resolved?.actorId), rank: ZONE_RANK[worstZone],
        });
      }
    }
    story.push(...issues.sort((a, b) => b.rank - a.rank).map(({ rank: _r, ...i }) => i));

    // Carried over: the previous day's worst reading.
    const wp = worstPrevious as DailyBrief['carriedOver']['worstPrevious'];
    const wpKey = wp ? REASON_PARAM[wp.reason.code] : undefined;
    if (wp && wpKey) {
      const last = readingsD.filter((r) => r.pondId === wp.pondId && r.v[wpKey] != null).pop();
      const ok = !!last && zoneOf(last, wpKey) === 'optimal';
      story.push({
        code: ok ? 'carried_resolved' : 'carried_open', tone: ok ? 'good' : wp.reason.severity, carriedKind: 'reading',
        pondId: wp.pondId, reason: wp.reason, resolvedAt: ok ? last!.at.toISOString() : null, personName: ok ? nameOf(last!.actorId) : null,
      });
    }
    // Carried over: overdue tasks and open alerts, one line each for resolved / still open.
    const carriedGroup = (kind: 'task' | 'alert', rows: any[], resolved: (x: any) => boolean, tone: (xs: any[]) => StoryTone, whenDone: (x: any) => string | null, who: (x: any) => string | null) => {
      for (const ok of [true, false]) {
        const xs = rows.filter((x) => resolved(x) === ok);
        if (!xs.length) continue;
        const one = xs.length === 1 ? xs[0] : null;
        story.push({
          code: ok ? 'carried_resolved' : 'carried_open', tone: ok ? 'good' : tone(xs), carriedKind: kind, count: xs.length,
          pondId: one?.pond_id ?? null, title: one?.title ?? null,
          resolvedAt: ok && one ? whenDone(one) : null, personName: ok && one ? who(one) : null,
        });
      }
    };
    carriedGroup('task', overdue, (t) => taskDone(t, dR.end), () => 'watch',
      (t) => (t.completed_at ? new Date(t.completed_at).toISOString() : null), (t) => nameOf(completerOf(t)));
    carriedGroup('alert', openAtStart, (a) => !openAt(dR.end)(a), (xs) => (xs.some((a) => a.severity === 'critical') ? 'critical' : 'watch'),
      (a) => new Date(a.updated_at).toISOString(), () => null);
    // Carried over: ponds already unwatched the day before; resolved once logged enough to drop off.
    const staleNow = new Map(stalePonds.map((s) => [s.pondId, s]));
    for (const s of staleBefore) {
      const now_ = staleNow.get(s.pondId);
      story.push({
        code: now_ ? 'carried_open' : 'carried_resolved', tone: now_ ? now_.severity : 'good', carriedKind: 'stale_pond',
        pondId: s.pondId, count: now_ ? worstDays(now_) : s.days,
        resolvedAt: now_ ? null : (work.filter((w) => w.pondId === s.pondId).map((w) => w.at).sort()[0] ?? null),
      });
    }
    for (const s of stalePonds) {
      if (!staleBefore.some((b) => b.pondId === s.pondId)) story.push({ code: 'stale_pond', tone: s.severity, pondId: s.pondId, count: worstDays(s) });
    }

    // Events of the day, per listed pond.
    for (const p of pondDays) {
      const id = p.pondId;
      if (p.health.mortality != null && isMortalitySpike(p.health.mortality, p.health.mortality7DayAvg)) {
        story.push({ code: 'mortality_spike', tone: 'watch', pondId: id, count: p.health.mortality });
      }
      const hv = harvests.filter((h: any) => h.pond_id === id && h.day === D);
      if (hv.length) story.push({ code: 'harvest_done', tone: 'good', pondId: id, value: r2(sum(hv, 'kg')) });
      const sm = samplings.filter((s: any) => s.pond_id === id && s.day === D);
      if (sm.length) {
        const prev = abwRows.find((r: any) => r.pond_id === id)?.prev_sampling ?? null;
        const pr = ponds.find((x: any) => x.id === id);
        const first = p.cycleActive && (!prev || prev < pr.stocking_date);
        const g = num(sm[sm.length - 1].mbw);
        story.push({ code: first ? 'first_sampling' : 'sampling_done', tone: first ? 'good' : 'info', pondId: id, ...(g != null ? { value: r2(g) } : {}) });
      }
      const tr = treatments.filter((t: any) => t.pond_id === id && t.day === D);
      if (tr.length) story.push({ code: 'treatment_given', tone: tr.some((t: any) => t.flag === 'banned') ? 'critical' : 'info', pondId: id, count: tr.length });
    }
    // D3.5: the 7 days after a banned treatment carry a watch line; the day itself is critical above.
    const bannedWeek = hasPonds
      ? await q_('banned_week',
        `SELECT c.pond_id, max(r.treatment_date)::text AS day
           FROM treatments r JOIN crops c ON c.id = r.crop_id
          WHERE c.pond_id = ANY($1::uuid[]) AND r.banned_substance_flag = 'banned'
            AND r.treatment_date BETWEEN $2 AND $3
          GROUP BY c.pond_id`,
        [pondIds, addDays(D, -7), P])
      : [];
    for (const b of bannedWeek) story.push({ code: 'antimicrobial_watch', tone: 'watch', pondId: b.pond_id, at: b.day });

    // D6: a disease episode still `ongoing` 14+ days after it was logged, on a
    // running cycle. Outcome is current state, not history, so today only.
    // Before migration 1780701500000 the column is missing → no line.
    if (isToday && hasPonds) {
      const open = await q_('disease_ongoing',
        `SELECT c.pond_id, d.name, min(r.recorded_date)::text AS since
           FROM disease_records r
           JOIN crops c ON c.id = r.crop_id
           JOIN disease_library d ON d.id = r.disease_id
          WHERE c.pond_id = ANY($1::uuid[]) AND c.status = 'active'
            AND r.outcome = 'ongoing' AND r.recorded_date <= $2
          GROUP BY 1, 2
          ORDER BY 3
          LIMIT 20`,
        [pondIds, addDays(D, -DISEASE_WATCH_DAYS)]).catch((err) => {
        if (isMissingSchema(err)) return [] as any[];
        throw err;
      });
      for (const o of open) {
        story.push({ code: 'disease_ongoing', tone: 'watch', pondId: o.pond_id, title: o.name, count: daysBetween(o.since, D) });
      }
    }

    // Coverage of stocked ponds and the day's tasks. Today these read "so far", so they don't warn yet.
    const behind: StoryTone = isToday ? 'info' : 'watch';
    if (stockedPonds) {
      const notFed = missingLogs.filter((m) => m.kinds.includes('feed')).length;
      const notTested = missingLogs.filter((m) => m.kinds.includes('water')).length;
      story.push(notFed ? { code: 'ponds_not_fed', tone: behind, count: notFed } : { code: 'all_ponds_fed', tone: 'good', count: stockedPonds });
      story.push(notTested ? { code: 'ponds_not_tested', tone: behind, count: notTested } : { code: 'all_ponds_tested', tone: 'good', count: stockedPonds });
    }
    const dueD = visibleTasks.filter((t: any) => t.due_date === D);
    if (dueD.length) {
      const left = dueD.filter((t: any) => !taskDone(t, dR.end)).length;
      story.push(left ? { code: 'tasks_left', tone: behind, count: left } : { code: 'tasks_all_done', tone: 'good', count: dueD.length });
    }
    if (moltHappening && moltHappening.phase !== 'inter') story.push({ code: 'molt_phase', tone: 'info', phase: moltHappening.phase });
    if (canSeeAttendance && present) story.push({ code: 'team_in', tone: 'info', count: present });
    // Stable sort: within a tone, the order pushed above.
    const storyOut = story.map((s, i) => ({ s, i })).sort((a, b) => TONE_RANK[a.s.tone] - TONE_RANK[b.s.tone] || a.i - b.i).slice(0, STORY_MAX).map((x) => x.s);

    return {
      date: D,
      isToday,
      generatedAt: now.toISOString(),
      farm: q.farmId ? (farms.map((f: any) => ({ id: f.id, name: f.name }))[0] ?? null) : null,
      farms: farms.map((f: any) => ({ id: f.id, name: f.name })),
      canViewFinancials,
      hasAnyData: timeline.some((e) => !['alert', 'task_done', 'check_in'].includes(e.kind)),
      score,
      previousScore,
      verdict: {
        // Fewer than half the stocked ponds scored ⇒ the farm score is not a verdict.
        band: !score ? 'none' : scoredStockedPonds * 2 < stockedPonds ? 'incomplete' : score.band,
        pondsGood: bandCount('good'),
        pondsWatch: bandCount('watch'),
        pondsAttention: bandCount('attention'),
        pondsUnscored: pondDays.filter((p) => !p.score).length,
        stockedPonds,
        scoredStockedPonds,
        weakestPondId,
      },
      ponds: pondDays.map(({ areaM2: _a, prevValue: _p, ...rest }) => rest),
      timeline,
      story: storyOut,
      done,
      carriedOver: {
        openAlerts: openAtStart
          .map((a: any) => ({ pondId: a.pond_id ?? null, title: a.title, severity: (a.severity === 'critical' ? 'critical' : 'watch') as Severity, source: a.type })),
        overdueTasks: overdue.map(toTask),
        worstPrevious,
        moltPending,
        stalePonds,
      },
      todo: {
        tasks: visibleTasks.filter((t: any) => t.due_date === D).map(toTask),
        missingLogs,
        moltItems,
      },
      happening: {
        molt: moltHappening,
        harvestsPlanned: plans.map((h: any) => ({
          pondId: h.pond_id,
          plannedDate: toIstDateString(new Date(h.planned_harvest_date)),
          targetWeightKg: num(h.target),
        })),
        milestones,
        lowStock: items
          .filter((i: any) => isLowStock({ quantity: i.quantity, reorderLevel: i.reorder_level }))
          .map((i: any) => ({ itemId: i.id, name: i.name, quantity: Number(i.quantity), unit: i.unit ?? '' })),
        attendance:
          canSeeAttendance && members[0]?.total
            ? { present, total: Number(members[0].total) }
            : null,
      },
      totals: {
        feedKg: r2(pondDays.reduce((s, p) => s + p.feed.kg, 0)),
        feedKgPrev: feedP.length ? r2(sum(feedP, 'kg')) : null,
        mortality: sum(inListed(dayOf(mortDays, D)), 'qty'),
        mortalityPrev: mortP.length ? sum(mortP, 'qty') : null,
        waterTests: readingsD.length,
        samplings: inListed(dayOf(samplings, D)).length,
        harvestKg: r2(sum(inListed(dayOf(harvests, D)), 'kg')),
        treatments: inListed(dayOf(treatments, D)).length,
        spend: canViewFinancials ? r2(Number(money[0]?.spend) || 0) : null,
        income: canViewFinancials ? r2(Number(money[0]?.income) || 0) : null,
      },
    };
  }

  /** min/max/last + zone per parameter for one pond-day's readings (oldest first). */
  private waterDay(rs: Reading[], species: string | null): PondDay['water'] {
    const lastOf = (k: WaterKey) => {
      for (let i = rs.length - 1; i >= 0; i--) if (rs[i].v[k] != null) return rs[i].v[k] as number;
      return null;
    };
    const param = (values: number[], zone: (min: number, max: number) => Zone): ParamDay | null =>
      values.length
        ? { min: r2(Math.min(...values)), max: r2(Math.max(...values)), last: r2(values[values.length - 1]), zone: zone(Math.min(...values), Math.max(...values)) }
        : null;
    const worse = (a: Zone, b: Zone) => (ZONE_RANK[a] >= ZONE_RANK[b] ? a : b);
    const range = (k: WaterKey) => (lo: number, hi: number) => {
      const t = thresholdFor(species, k);
      return worse(classify(lo, t), classify(hi, t));
    };
    const vals = (k: WaterKey) => rs.map((r) => r.v[k]).filter((v): v is number => v != null);

    // Free NH3 per ammonia reading, with pH/temp from the same record or the day's latest.
    const dayPh = lastOf('ph');
    const dayTemp = lastOf('temperature');
    const daySal = lastOf('salinity');
    const nh3 = rs
      .filter((r) => r.v.ammonia != null)
      .map((r) => {
        const ph = r.v.ph ?? dayPh;
        const temp = r.v.temperature ?? dayTemp;
        if (ph == null || temp == null) return null;
        return this.calc.calculateFreeAmmonia(r.v.ammonia as number, ph, temp, r.v.salinity ?? daySal ?? 0).unionizedAmmonia;
      })
      .filter((v): v is number => v != null);

    const ph = param(vals('ph'), (lo, hi) => {
      const z = range('ph')(lo, hi);
      return hi - lo > 0.5 ? worse(z, 'caution') : z;
    });
    return {
      tests: rs.length,
      do: param(vals('do'), (lo) => classify(lo, thresholdFor(species, 'do'))),
      ph: ph ? { ...ph, swing: r2((ph.max as number) - (ph.min as number)) } : null,
      temperature: param(vals('temperature'), range('temperature')),
      salinity: param(vals('salinity'), range('salinity')),
      alkalinity: param(vals('alkalinity'), range('alkalinity')),
      ammonia: param(vals('ammonia'), (_lo, hi) => classify(hi, thresholdFor(species, 'ammonia'))),
      freeNh3: param(nh3, (_lo, hi) => classify(hi, FREE_NH3)),
      nitrite: param(vals('nitrite'), (_lo, hi) => classify(hi, thresholdFor(species, 'nitrite'))),
    };
  }
}
