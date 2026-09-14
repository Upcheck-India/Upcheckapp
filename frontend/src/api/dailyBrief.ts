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
    | 'alert_open';

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
        band: Band | 'none';
        pondsGood: number;
        pondsWatch: number;
        pondsAttention: number;
        pondsUnscored: number;
        weakestPondId: string | null;
    };

    ponds: PondDay[];
    timeline: TimelineEvent[];

    /** What the day started with — left over from the day before. */
    carriedOver: {
        openAlerts: { pondId: string | null; title: string; severity: Severity; source: string }[];
        overdueTasks: BriefTask[];
        worstPrevious: { pondId: string; reason: Reason } | null;
        moltPending: { pondId: string; keys: string[] }[];
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
