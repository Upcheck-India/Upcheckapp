/**
 * Mirror of the Daily Brief contract `frontend/src/api/dailyBrief.ts`
 * (spec docs/superpowers/specs/2026-09-14-daily-brief-design.md). Keep these
 * types byte-for-byte equivalent — the frontend file is the source of truth.
 */

export type Zone = 'optimal' | 'caution' | 'critical';
export type Band = 'good' | 'watch' | 'attention';
export type ScorePart = 'water' | 'feeding' | 'health' | 'care';
export type Severity = 'watch' | 'critical';

export type ReasonCode =
  // water
  | 'do_low'
  | 'ph_out_of_range'
  | 'ph_swing'
  | 'ammonia_high'
  | 'free_nh3_high'
  | 'temp_out_of_range'
  | 'salinity_out_of_range'
  | 'alkalinity_out_of_range'
  | 'nitrite_high'
  // feeding
  | 'feed_not_logged'
  | 'feed_drop'
  | 'tray_a_lot_left'
  // health
  | 'mortality_high'
  | 'mortality_spike'
  | 'banned_treatment'
  | 'molt_handling'
  // care
  | 'water_not_logged'
  | 'tray_not_checked'
  | 'task_missed'
  | 'alert_open'
  // coverage
  | 'pond_not_logged';

export interface Reason {
  code: ReasonCode;
  severity: Severity;
  pondId?: string;
  value?: number;
  limit?: number;
}

export interface Part {
  earned: number;
  possible: number;
  measured: boolean;
}

export interface DayScore {
  value: number;
  band: Band;
  capped: boolean;
  capReasons: Reason[];
  parts: Record<ScorePart, Part>;
  basedOn: ScorePart[];
  missing: ScorePart[];
  reasons: Reason[];
}

export interface ParamDay {
  min: number | null;
  max: number | null;
  last: number | null;
  zone: Zone | null;
}

export interface PondDay {
  pondId: string;
  name: string;
  farmId: string;
  cycleActive: boolean;
  doc: number | null;
  score: DayScore | null;
  previousScore: number | null;
  water: {
    tests: number;
    do: ParamDay | null;
    ph: (ParamDay & { swing: number | null }) | null;
    temperature: ParamDay | null;
    salinity: ParamDay | null;
    alkalinity: ParamDay | null;
    ammonia: ParamDay | null;
    freeNh3: ParamDay | null;
    nitrite: ParamDay | null;
  };
  feed: {
    kg: number;
    prev3DayAvgKg: number | null;
    sessions: string[];
    trayWorst: 'empty' | 'few_left' | 'a_lot_left' | null;
  };
  health: {
    mortality: number | null;
    mortalityPct: number | null;
    mortality7DayAvg: number | null;
    abwG: number | null;
    biomassKg: number | null;
    livePopulation: number | null;
    treatments: number;
  };
  molt: { phase: 'pre' | 'peak' | 'post' | 'inter'; pendingCritical: number } | null;
  /** Days since last log as of the date (IST; same day = 0). Stocked + never logged ⇒ since stocking. */
  lastLog: {
    waterDate: string | null;
    feedDate: string | null;
    anyDate: string | null;
    daysSinceWater: number | null;
    daysSinceFeed: number | null;
    daysSinceAny: number | null;
  };
}

/** Stocked pond gone unwatched: watch ≥ 2 days no water OR ≥ 3 days no log; critical when either ≥ 7. */
export interface StalePond {
  pondId: string;
  daysSinceWater: number | null;
  daysSinceAny: number | null;
  severity: Severity;
}

export type TimelineKind =
  | 'water'
  | 'feed'
  | 'tray'
  | 'mortality'
  | 'sampling'
  | 'harvest'
  | 'treatment'
  | 'chemical'
  | 'alert'
  | 'task_done'
  | 'check_in';

export interface TimelineEvent {
  at: string;
  allDay: boolean;
  kind: TimelineKind;
  pondId: string | null;
  severity?: Severity;
  summary: string;
}

export interface BriefTask {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done' | 'verified' | 'cancelled';
  priority: string | null;
  dueDate: string | null;
  timeWindowStart: string | null;
  pondId: string | null;
  assigneeNames: string[];
}

export interface DailyBrief {
  date: string;
  isToday: boolean;
  generatedAt: string;
  farm: { id: string; name: string } | null;
  farms: { id: string; name: string }[];
  canViewFinancials: boolean;
  hasAnyData: boolean;

  score: DayScore | null;
  previousScore: number | null;
  verdict: {
    band: Band | 'none' | 'incomplete';
    pondsGood: number;
    pondsWatch: number;
    pondsAttention: number;
    pondsUnscored: number;
    stockedPonds: number;
    scoredStockedPonds: number;
    weakestPondId: string | null;
  };

  ponds: PondDay[];
  timeline: TimelineEvent[];

  carriedOver: {
    openAlerts: { pondId: string | null; title: string; severity: Severity; source: string }[];
    overdueTasks: BriefTask[];
    worstPrevious: { pondId: string; reason: Reason } | null;
    moltPending: { pondId: string; keys: string[] }[];
    stalePonds: StalePond[];
  };

  todo: {
    tasks: BriefTask[];
    missingLogs: { pondId: string; kinds: ('water' | 'feed' | 'tray' | 'mortality')[] }[];
    moltItems: {
      pondId: string;
      key: string;
      priority: 'critical' | 'important' | 'routine';
      status: 'done' | 'pending' | 'violated';
      route: string | null;
    }[];
  };

  happening: {
    molt: {
      phase: 'pre' | 'peak' | 'post' | 'inter';
      peakDate: string | null;
      preStart: string | null;
      postEnd: string | null;
      pondsWithPending: number;
    } | null;
    harvestsPlanned: { pondId: string; plannedDate: string; targetWeightKg: number | null }[];
    milestones: { pondId: string; doc: number; kind: 'doc_30' | 'doc_60' | 'doc_90' | 'target_days' }[];
    lowStock: { itemId: string; name: string; quantity: number; unit: string }[];
    attendance: { present: number; total: number } | null;
  };

  totals: {
    feedKg: number;
    feedKgPrev: number | null;
    mortality: number;
    mortalityPrev: number | null;
    waterTests: number;
    samplings: number;
    harvestKg: number;
    treatments: number;
    spend: number | null;
    income: number | null;
  };
}
