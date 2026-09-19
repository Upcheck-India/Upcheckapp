/**
 * Daily Brief — one IST day of a farm (or all farms) at a glance.
 *
 * Contract shared by the backend `GET /daily-brief`, the Daily Brief screen and
 * the day-report export. Spec: docs/superpowers/specs/2026-09-14-daily-brief-design.md
 *
 * Everything a farmer reads is a CODE here (reason codes, zones, kinds) so the
 * screen, the PDF and the image card translate it into all six languages from
 * one place (`dailyBrief.*` i18n namespace).
 */
import apiClient from './client';

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
    /** The measured value that triggered it, in the parameter's own unit. */
    value?: number;
    /** The limit it was judged against. */
    limit?: number;
}

export interface Part {
    earned: number;
    possible: number;
    measured: boolean;
}

export interface DayScore {
    /** 0–100, rounded. */
    value: number;
    band: Band;
    /** True when a critical condition held the score at ≤ 59. */
    capped: boolean;
    capReasons: Reason[];
    parts: Record<ScorePart, Part>;
    basedOn: ScorePart[];
    missing: ScorePart[];
    /** Worst first; at most 5. */
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
    /**
     * How long since this pond was last logged, as of the brief's date (IST).
     * Days are counted from the date: logged on the date = 0. For a stocked pond
     * with no log ever, days count from its stocking date. Null when no cycle and
     * nothing logged.
     */
    lastLog: {
        waterDate: string | null;
        feedDate: string | null;
        anyDate: string | null;
        daysSinceWater: number | null;
        daysSinceFeed: number | null;
        daysSinceAny: number | null;
    };
}

/**
 * A stocked pond that has gone unwatched (founder decision 2026-09-14):
 * watch when ≥ 2 days without a water test OR ≥ 3 days with no log of any kind;
 * critical when either reaches ≥ 7 days.
 */
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
    /** ISO instant. DATE-only records are placed at 12:00 IST and marked `allDay`. */
    at: string;
    allDay: boolean;
    kind: TimelineKind;
    pondId: string | null;
    severity?: Severity;
    /** Short, already-human text from the source row (e.g. "DO 3.2 · pH 8.1"). Numbers only, no prose. */
    summary: string;
    /** Who logged it (same visibility as the Activity feed). Optional: older backends omit it. */
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
    /** Ponds they logged anything in. */
    pondIds: string[];
    tasksDone: number;
}

export interface PondWork {
    pondId: string;
    counts: Partial<Record<WorkKind, number>>;
    feedKg: number;
    /** Distinct feed entries (rounds). */
    feedRounds: number;
    /** ABW of a sampling logged that day, if any. */
    samplingG: number | null;
    harvestKg: number | null;
    /** Everyone who logged in this pond that day. */
    people: string[];
}

/**
 * One line of the day's story (founder 2026-09-14): what got done, what carried
 * over and whether it resolved, what important happened. Codes, so all six
 * languages phrase it; the frontend owns the sentences.
 */
export type StoryCode =
    // coverage / routine
    | 'all_ponds_fed'
    | 'all_ponds_tested'
    | 'ponds_not_fed'
    | 'ponds_not_tested'
    | 'tasks_all_done'
    | 'tasks_left'
    // events that happened this day
    | 'issue_resolved'      // a watch/critical reading later back in a safe zone the same day
    | 'issue_open'          // a watch/critical reading with no later safe reading that day
    | 'mortality_spike'
    | 'harvest_done'
    | 'sampling_done'
    | 'first_sampling'      // first sampling of the cycle
    | 'treatment_given'
    | 'antimicrobial_watch' // a banned treatment in the last 7 days; `at` = its date (D3)
    | 'disease_ongoing'     // D6: a disease record still ongoing 14+ days on (title = disease, count = days)
    // carried over from before this day
    | 'carried_resolved'    // something open at the start of the day that was dealt with
    | 'carried_open'        // still open at the end of the day
    | 'stale_pond'
    // context
    | 'molt_phase'
    | 'team_in';

export type StoryTone = 'good' | 'info' | 'watch' | 'critical';

export interface StoryItem {
    code: StoryCode;
    tone: StoryTone;
    pondId?: string | null;
    /** For issue_*: which reading. */
    reason?: Reason;
    /** Count for plural sentences (ponds, tasks, animals, people). */
    count?: number;
    /** Value for sentences like "12.4 g", "850 kg". */
    value?: number;
    /** When it happened / when it was resolved (ISO). */
    at?: string | null;
    resolvedAt?: string | null;
    /** For carried_*: what kind of thing carried over. */
    carriedKind?: 'alert' | 'task' | 'stale_pond' | 'reading';
    /** Short title for a carried task or alert (user/engine text). */
    title?: string | null;
    personName?: string | null;
    /** For molt_phase. */
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
    /** YYYY-MM-DD, IST. */
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
        /**
         * 'incomplete' when fewer than half of the stocked ponds were scored
         * (founder decision 2026-09-14): the farm score value is still sent but
         * must not be presented as Good/Watch/Attention. 'none' = nothing scored.
         */
        band: Band | 'none' | 'incomplete';
        pondsGood: number;
        pondsWatch: number;
        pondsAttention: number;
        pondsUnscored: number;
        /** Ponds with a cycle on the date — the denominator every farm-level sentence uses. */
        stockedPonds: number;
        /** Of those, how many got a score. */
        scoredStockedPonds: number;
        weakestPondId: string | null;
    };

    ponds: PondDay[];
    timeline: TimelineEvent[];

    /**
     * The day's story, most important first: critical/open issues, then
     * resolutions and carried-over outcomes, then routine coverage and context.
     * At most ~8 items. Optional: older backends omit it.
     */
    story?: StoryItem[];

    /**
     * What the farm and team did this day. Visible to everyone on the farm, like
     * the Activity feed; `people[].shift` only for owners/managers.
     * Optional: older backends omit it.
     */
    done?: {
        people: PersonDay[];
        ponds: PondWork[];
        tasksDone: { id: string; title: string; pondId: string | null; completedAt: string; completedByName: string | null }[];
    };

    /** What the day started with — left over from the day before. */
    carriedOver: {
        openAlerts: { pondId: string | null; title: string; severity: Severity; source: string }[];
        overdueTasks: BriefTask[];
        worstPrevious: { pondId: string; reason: Reason } | null;
        moltPending: { pondId: string; keys: string[] }[];
        /** Worst first (critical, then most days). */
        stalePonds: StalePond[];
    };

    /** What to do on this day. */
    todo: {
        tasks: BriefTask[];
        missingLogs: { pondId: string; kinds: ('water' | 'feed' | 'tray' | 'mortality')[] }[];
        moltItems: { pondId: string; key: string; priority: 'critical' | 'important' | 'routine'; status: 'done' | 'pending' | 'violated'; route: string | null }[];
    };

    /** What is happening / will happen on this day. */
    happening: {
        molt: { phase: 'pre' | 'peak' | 'post' | 'inter'; peakDate: string | null; preStart: string | null; postEnd: string | null; pondsWithPending: number } | null;
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
        /** null unless canViewFinancials. */
        spend: number | null;
        income: number | null;
    };
}

export const dailyBriefApi = {
    get: (params: { date: string; farmId?: string }) =>
        apiClient.get<DailyBrief>('/daily-brief', { params }),
};
