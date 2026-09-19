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
  /** Who logged it (same visibility as the Activity feed). Never an email. */
  actorId?: string | null;
  actorName?: string | null;
}

/** The kinds of farm work counted in "What we did". */
export type WorkKind = 'water' | 'feed' | 'tray' | 'mortality' | 'sampling' | 'harvest' | 'treatment' | 'chemical';

export interface PersonDay {
  userId: string;
  name: string;
  /** Their farm role on the farm(s) in scope; highest if several. */
  role: 'owner' | 'manager' | 'worker' | 'viewer' | null;
  /** Only when the caller may see attendance (owner/manager); otherwise null. */
  shift: { checkIn: string | null; checkOut: string | null; hours: number | null } | null;
  counts: Partial<Record<WorkKind, number>>;
  feedKg: number;
  pondIds: string[];
  tasksDone: number;
  /** Their picture (thumbnail), when the caller may see it; else null/absent. */
  avatarThumbUrl?: string | null;
}

export interface PondWork {
  pondId: string;
  counts: Partial<Record<WorkKind, number>>;
  feedKg: number;
  feedRounds: number;
  samplingG: number | null;
  harvestKg: number | null;
  people: string[];
}

export type StoryCode =
  // coverage / routine
  | 'all_ponds_fed'
  | 'all_ponds_tested'
  | 'ponds_not_fed'
  | 'ponds_not_tested'
  | 'tasks_all_done'
  | 'tasks_left'
  // a banned treatment in the last 7 days (`at` = its date, D3.5)
  | 'antimicrobial_watch'
  // events that happened this day
  | 'issue_resolved'
  | 'issue_open'
  | 'mortality_spike'
  | 'harvest_done'
  | 'sampling_done'
  | 'first_sampling'
  | 'treatment_given'
  // a disease record still `ongoing` 14+ days on (D6); title = disease, count = days
  | 'disease_ongoing'
  // carried over from before this day
  | 'carried_resolved'
  | 'carried_open'
  | 'stale_pond'
  // context
  | 'molt_phase'
  | 'team_in';

export type StoryTone = 'good' | 'info' | 'watch' | 'critical';

export interface StoryItem {
  code: StoryCode;
  tone: StoryTone;
  pondId?: string | null;
  reason?: Reason;
  count?: number;
  value?: number;
  at?: string | null;
  resolvedAt?: string | null;
  carriedKind?: 'alert' | 'task' | 'stale_pond' | 'reading';
  title?: string | null;
  personName?: string | null;
  phase?: 'pre' | 'peak' | 'post';
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

  /** The day's story, most important first; at most 8. */
  story?: StoryItem[];

  /** What the farm and team did this day; `people[].shift` only for owners/managers. */
  done?: {
    people: PersonDay[];
    ponds: PondWork[];
    tasksDone: { id: string; title: string; pondId: string | null; completedAt: string; completedByName: string | null }[];
  };

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
