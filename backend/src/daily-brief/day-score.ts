import {
  FREE_NH3,
  FiveZoneThreshold,
  ThresholdParam,
  Zone,
  classify,
  classifyZone,
  thresholdFor,
} from '../common/wq-thresholds';
import { Band, DayScore, Part, Reason, ReasonCode, ScorePart } from './daily-brief.types';

/**
 * Day Score — pure. Spec 2026-09-14 "Day Score (approved)".
 *
 * Per pond, per IST day, 100 points from what was logged that day:
 * water 40 · feeding 20 · health 25 · care 15. Not logged ⇒ not counted; no
 * score unless water or feeding was logged; any critical condition caps at 59.
 */

export interface MinMax {
  min: number | null;
  max: number | null;
}

export type TrayStatus = 'empty' | 'few_left' | 'a_lot_left';

export interface DayScoreInput {
  pondId?: string;
  species: string | null;
  /** Each parameter's range that day; absent or min=null ⇒ not logged. */
  water: Partial<
    Record<'do' | 'ph' | 'temperature' | 'salinity' | 'alkalinity' | 'ammonia' | 'freeNh3' | 'nitrite', MinMax | null>
  >;
  feed: {
    logged: boolean;
    kg: number;
    prev3DayAvgKg: number | null;
    trayWorst: TrayStatus | null;
  };
  health: {
    /** Deaths logged that day; null = mortality not logged. */
    mortality: number | null;
    livePopulation: number | null;
    mortality7DayAvg: number | null;
    bannedTreatment: boolean;
    treatmentLogged: boolean;
    /** Sampling or harvest logged that day. */
    handlingLogged: boolean;
  };
  moltPhase: 'pre' | 'peak' | 'post' | 'inter' | null;
  care: {
    cycleActive: boolean;
    tasksDue: number;
    tasksDone: number;
    /** A critical alert was still open at the end of the day. */
    criticalAlertOpen: boolean;
  };
}

export const CAP = 59;
const PTS: Record<ScorePart, number> = { water: 40, feeding: 20, health: 25, care: 15 };
const PARTS: ScorePart[] = ['water', 'feeding', 'health', 'care'];
const FACTOR: Record<Zone, number> = { optimal: 1, caution: 0.5, critical: 0 };
const RANK: Record<Zone, number> = { optimal: 0, caution: 1, critical: 2 };
const worse = (a: Zone, b: Zone): Zone => (RANK[a] >= RANK[b] ? a : b);
const sev = (z: Zone) => (z === 'critical' ? 'critical' : 'watch') as Reason['severity'];
const r1 = (n: number) => Math.round(n * 10) / 10;

export const bandFor = (value: number): Band =>
  value >= 80 ? 'good' : value >= 60 ? 'watch' : 'attention';

/** Zone + the limit crossed, for one value. */
function judge(value: number, t: FiveZoneThreshold): { zone: Zone; limit?: number } {
  const z = classifyZone(value, t);
  const limit =
    z === 'critical-low' ? t.criticalLow
    : z === 'caution-low' ? t.cautionLow
    : z === 'critical-high' ? t.criticalHigh
    : z === 'caution-high' ? t.cautionHigh
    : undefined;
  return { zone: classify(value, t), limit: limit ?? undefined };
}

/** Worse of a day's min and max. */
function judgeRange(r: MinMax, t: FiveZoneThreshold) {
  const lo = judge(r.min as number, t);
  const hi = judge((r.max ?? r.min) as number, t);
  return RANK[hi.zone] > RANK[lo.zone]
    ? { ...hi, value: (r.max ?? r.min) as number }
    : { ...lo, value: r.min as number };
}

const logged = (r: MinMax | null | undefined): r is MinMax => r != null && r.min != null;

export function computeDayScore(input: DayScoreInput): DayScore | null {
  const pondId = input.pondId;
  const reasons: Reason[] = [];
  const capReasons: Reason[] = [];
  const add = (code: ReasonCode, zone: Zone, value?: number, limit?: number, caps = false) => {
    if (zone === 'optimal') return;
    const r: Reason = {
      code,
      severity: sev(zone),
      ...(pondId ? { pondId } : {}),
      ...(value != null ? { value: r1Keep(value) } : {}),
      ...(limit != null ? { limit } : {}),
    };
    if (!reasons.some((x) => x.code === code)) reasons.push(r);
    if (caps && zone === 'critical') capReasons.push(r);
  };
  const parts = {} as Record<ScorePart, Part>;

  // ── water (40) ──
  const w = input.water;
  const params: { key: keyof DayScoreInput['water']; weight: number }[] = [
    { key: 'do', weight: 35 },
    { key: 'ammonia', weight: 20 },
    { key: 'ph', weight: 20 },
    { key: 'temperature', weight: 10 },
    { key: 'salinity', weight: 5 },
    { key: 'alkalinity', weight: 5 },
    { key: 'nitrite', weight: 5 },
  ];
  let wSum = 0;
  let wGot = 0;
  for (const { key, weight } of params) {
    const r = w[key];
    if (!logged(r)) continue;
    let zone: Zone;
    switch (key) {
      case 'do': {
        const j = judge(r.min as number, thresholdFor(input.species, 'do'));
        zone = j.zone;
        add('do_low', zone, r.min as number, j.limit, true);
        break;
      }
      case 'ammonia': {
        const tan = judge((r.max ?? r.min) as number, thresholdFor(input.species, 'ammonia'));
        add('ammonia_high', tan.zone, (r.max ?? r.min) as number, tan.limit, true);
        zone = tan.zone;
        if (logged(w.freeNh3)) {
          const f = judge((w.freeNh3.max ?? w.freeNh3.min) as number, FREE_NH3);
          add('free_nh3_high', f.zone, (w.freeNh3.max ?? w.freeNh3.min) as number, f.limit, true);
          zone = worse(zone, f.zone);
        }
        break;
      }
      case 'ph': {
        const j = judgeRange(r, thresholdFor(input.species, 'ph'));
        add('ph_out_of_range', j.zone, j.value, j.limit, true);
        zone = j.zone;
        const swing = r.max != null ? r.max - (r.min as number) : 0;
        if (swing > 0.5) {
          add('ph_swing', 'caution', swing, 0.5);
          zone = worse(zone, 'caution');
        }
        break;
      }
      case 'nitrite': {
        const j = judge((r.max ?? r.min) as number, thresholdFor(input.species, 'nitrite'));
        add('nitrite_high', j.zone, (r.max ?? r.min) as number, j.limit);
        zone = j.zone;
        break;
      }
      default: {
        const code = `${key === 'temperature' ? 'temp' : key}_out_of_range` as ReasonCode;
        const j = judgeRange(r, thresholdFor(input.species, key as ThresholdParam));
        add(code, j.zone, j.value, j.limit);
        zone = j.zone;
      }
    }
    wSum += weight;
    wGot += weight * FACTOR[zone];
  }
  parts.water = wSum
    ? { earned: r1((PTS.water * wGot) / wSum), possible: PTS.water, measured: true }
    : { earned: 0, possible: 0, measured: false };

  // ── feeding (20) ──
  const f = input.feed;
  if (f.logged || f.trayWorst != null) {
    let got = 0;
    let possible = 8;
    if (f.logged) got += 8;
    else add('feed_not_logged', 'caution');
    if (f.trayWorst != null) {
      possible += 6;
      if (f.trayWorst === 'a_lot_left') add('tray_a_lot_left', 'caution');
      else got += 6;
    }
    if (f.logged) {
      possible += 6;
      const base = f.prev3DayAvgKg;
      if (!base || input.moltPhase === 'peak' || f.kg >= 0.7 * base) got += 6;
      else add('feed_drop', 'caution', f.kg, r1(0.7 * base));
    }
    parts.feeding = { earned: r1((PTS.feeding * got) / possible), possible: PTS.feeding, measured: true };
  } else {
    parts.feeding = { earned: 0, possible: 0, measured: false };
  }

  // ── health (25) ──
  const h = input.health;
  if (h.mortality != null || h.handlingLogged || h.treatmentLogged) {
    let zone: Zone = 'optimal';
    if (h.mortality != null) {
      if (h.livePopulation != null && h.livePopulation > 0) {
        const pct = (h.mortality / h.livePopulation) * 100;
        const z: Zone = pct > 0.3 ? 'critical' : pct > 0.1 ? 'caution' : 'optimal';
        add('mortality_high', z, pct, z === 'critical' ? 0.3 : 0.1, true);
        zone = worse(zone, z);
      }
      const avg = h.mortality7DayAvg ?? 0;
      if (h.mortality >= 10 && h.mortality > 3 * avg) {
        add('mortality_spike', 'caution', h.mortality, r1(3 * avg));
        zone = worse(zone, 'caution');
      }
    }
    if (h.bannedTreatment) {
      add('banned_treatment', 'critical', undefined, undefined, true);
      zone = 'critical';
    }
    if (h.handlingLogged && input.moltPhase === 'peak') {
      add('molt_handling', 'caution');
      zone = worse(zone, 'caution');
    }
    parts.health = { earned: r1(PTS.health * FACTOR[zone]), possible: PTS.health, measured: true };
  } else {
    parts.health = { earned: 0, possible: 0, measured: false };
  }

  // ── care (15) ──
  const c = input.care;
  if (c.cycleActive) {
    const waterTested = params.some((p) => logged(w[p.key]));
    let got = 0;
    if (waterTested) got += 5;
    else add('water_not_logged', 'caution');
    if (f.logged) got += 4;
    else add('feed_not_logged', 'caution');
    if (f.trayWorst != null) got += 2;
    else add('tray_not_checked', 'caution');
    if (c.tasksDue === 0) got += 2;
    else {
      got += (2 * Math.min(c.tasksDone, c.tasksDue)) / c.tasksDue;
      if (c.tasksDone < c.tasksDue) add('task_missed', 'caution', c.tasksDue - c.tasksDone);
    }
    if (!c.criticalAlertOpen) got += 2;
    else add('alert_open', 'caution');
    parts.care = { earned: r1(got), possible: PTS.care, measured: true };
  } else {
    parts.care = { earned: 0, possible: 0, measured: false };
  }

  if (!parts.water.measured && !parts.feeding.measured) return null;

  const basedOn = PARTS.filter((p) => parts[p].measured);
  const missing = PARTS.filter((p) => !parts[p].measured);
  const earned = basedOn.reduce((s, p) => s + parts[p].earned, 0);
  const possible = basedOn.reduce((s, p) => s + parts[p].possible, 0);
  let value = Math.round((100 * earned) / possible);
  const capped = capReasons.length > 0;
  if (capped) value = Math.min(value, CAP);

  return {
    value,
    band: bandFor(value),
    capped,
    capReasons,
    parts,
    basedOn,
    missing,
    reasons: worstFirst(reasons).slice(0, 5),
  };
}

/** Readings keep 2 decimals (ammonia 0.12 must not print as 0.1). */
function r1Keep(n: number) {
  return Math.round(n * 100) / 100;
}

const worstFirst = (rs: Reason[]) =>
  [...rs].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));

/**
 * Farm score: pond scores weighted by area (missing area ⇒ weight 1). Not
 * re-capped — each pond already carries its own cap; the farm's reasons are the
 * ponds' reasons (with pondId), worst first.
 */
export function combineScores(
  ponds: { pondId: string; areaM2: number | null; score: DayScore | null }[],
): { score: DayScore | null; weakestPondId: string | null } {
  const scored = ponds.filter((p) => p.score) as { pondId: string; areaM2: number | null; score: DayScore }[];
  if (!scored.length) return { score: null, weakestPondId: null };
  const weight = (a: number | null) => (a != null && a > 0 ? a : 1);
  const total = scored.reduce((s, p) => s + weight(p.areaM2), 0);
  const avg = (fn: (p: (typeof scored)[number]) => number) =>
    scored.reduce((s, p) => s + weight(p.areaM2) * fn(p), 0) / total;
  const value = Math.round(avg((p) => p.score.value));
  const parts = {} as Record<ScorePart, Part>;
  for (const part of PARTS) {
    const measured = scored.some((p) => p.score.parts[part].measured);
    parts[part] = {
      earned: r1(avg((p) => p.score.parts[part].earned)),
      possible: r1(avg((p) => p.score.parts[part].possible)),
      measured,
    };
  }
  const weakest = scored.reduce((a, b) => (b.score.value < a.score.value ? b : a));
  return {
    score: {
      value,
      band: bandFor(value),
      capped: false,
      capReasons: [],
      parts,
      basedOn: PARTS.filter((p) => parts[p].measured),
      missing: PARTS.filter((p) => !parts[p].measured),
      reasons: worstFirst(scored.flatMap((p) => p.score.reasons)).slice(0, 5),
    },
    weakestPondId: weakest.pondId,
  };
}

/** Area-weighted farm value from pond values, or null when none. */
export function combineValues(ponds: { areaM2: number | null; value: number | null }[]): number | null {
  const v = ponds.filter((p) => p.value != null);
  if (!v.length) return null;
  const weight = (a: number | null) => (a != null && a > 0 ? a : 1);
  const total = v.reduce((s, p) => s + weight(p.areaM2), 0);
  return Math.round(v.reduce((s, p) => s + weight(p.areaM2) * (p.value as number), 0) / total);
}
