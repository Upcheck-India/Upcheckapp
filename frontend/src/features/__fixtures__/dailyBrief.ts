/** Test fixtures for the Daily Brief contract (api/dailyBrief.ts). Not shipped to any screen. */
import type { DailyBrief, DayScore, PondDay } from '../../api/dailyBrief';

export const score = (value: number, over: Partial<DayScore> = {}): DayScore => ({
    value,
    band: value >= 80 ? 'good' : value >= 60 ? 'watch' : 'attention',
    capped: false,
    capReasons: [],
    parts: {
        water: { earned: 30, possible: 40, measured: true },
        feeding: { earned: 18, possible: 20, measured: true },
        health: { earned: 0, possible: 0, measured: false },
        care: { earned: 12, possible: 15, measured: true },
    },
    basedOn: ['water', 'feeding', 'care'],
    missing: ['health'],
    reasons: [],
    ...over,
});

export const pond = (id: string, name: string, s: DayScore | null, over: Partial<PondDay> = {}): PondDay => ({
    pondId: id,
    name,
    farmId: 'f1',
    cycleActive: true,
    doc: 42,
    score: s,
    previousScore: null,
    water: {
        tests: 2,
        do: { min: 4.2, max: 6.1, last: 5, zone: 'optimal' },
        ph: null,
        temperature: null,
        salinity: null,
        alkalinity: null,
        ammonia: null,
        freeNh3: null,
        nitrite: null,
    },
    feed: { kg: 32, prev3DayAvgKg: 30, sessions: [], trayWorst: 'few_left' },
    health: { mortality: 12, mortalityPct: 0.01, mortality7DayAvg: 10, abwG: 14, biomassKg: 900, livePopulation: 60000, treatments: 0 },
    molt: null,
    lastLog: { waterDate: '2026-09-14', feedDate: '2026-09-14', anyDate: '2026-09-14', daysSinceWater: 0, daysSinceFeed: 0, daysSinceAny: 0 },
    ...over,
});

export const makeBrief = (over: Partial<DailyBrief> = {}): DailyBrief => {
    const ponds = over.ponds ?? [pond('p1', 'Pond 1', score(86)), pond('p2', 'Pond 2', score(52, { capped: true, capReasons: [{ code: 'do_low', severity: 'critical', pondId: 'p2', value: 2.8, limit: 3 }] }))];
    return {
        date: '2026-09-14',
        isToday: true,
        generatedAt: '2026-09-14T02:30:00Z',
        farm: null,
        farms: [
            { id: 'f1', name: 'Kakinada East' },
            { id: 'f2', name: 'Ravi Farm' },
        ],
        canViewFinancials: true,
        hasAnyData: true,
        score: score(71, { reasons: [{ code: 'do_low', severity: 'critical', pondId: 'p2', value: 2.8, limit: 3 }] }),
        previousScore: 65,
        verdict: { band: 'watch', pondsGood: 1, pondsWatch: 0, pondsAttention: 1, pondsUnscored: 0, stockedPonds: 2, scoredStockedPonds: 2, weakestPondId: 'p2' },
        ponds,
        timeline: [
            { at: '2026-09-13T20:00:00Z', allDay: false, kind: 'water', pondId: 'p2', severity: 'critical', summary: 'DO 2.8' },
            { at: '2026-09-14T01:00:00Z', allDay: false, kind: 'feed', pondId: 'p1', summary: '8 kg' },
        ],
        carriedOver: { openAlerts: [], overdueTasks: [], worstPrevious: null, moltPending: [], stalePonds: [] },
        todo: {
            tasks: [{ id: 't1', title: 'Clean aerator', status: 'open', priority: 'medium', dueDate: '2026-09-14', timeWindowStart: null, pondId: 'p1', assigneeNames: [] }],
            missingLogs: [{ pondId: 'p2', kinds: ['feed', 'tray'] }],
            moltItems: [],
        },
        happening: { molt: null, harvestsPlanned: [], milestones: [], lowStock: [], attendance: { present: 4, total: 5 } },
        totals: { feedKg: 64, feedKgPrev: 60, mortality: 20, mortalityPrev: 25, waterTests: 4, samplings: 0, harvestKg: 0, treatments: 0, spend: 1200, income: null },
        ...over,
    };
};

const quiet = (days: number) => ({ waterDate: null, feedDate: null, anyDate: '2026-09-07', daysSinceWater: days, daysSinceFeed: days, daysSinceAny: days });
const founderStale = { pondId: 'ind06', daysSinceWater: 7, daysSinceAny: 7, severity: 'critical' as const };

/**
 * The founder's morning (spec addendum): 3 stocked ponds, P01 Good, P02 Watch,
 * IND06 with nothing logged for 7 days. 2 of 3 scored — covered, not incomplete.
 */
export const founderBrief = (over: Partial<DailyBrief> = {}): DailyBrief =>
    makeBrief({
        score: score(82),
        previousScore: 80,
        verdict: { band: 'good', pondsGood: 1, pondsWatch: 1, pondsAttention: 0, pondsUnscored: 1, stockedPonds: 3, scoredStockedPonds: 2, weakestPondId: 'p02' },
        ponds: [
            pond('p01', 'P01', score(88), { lastLog: { ...quiet(9), waterDate: '2026-09-14', daysSinceWater: 0, daysSinceAny: 0 } }),
            pond('p02', 'P02', score(68)),
            pond('ind06', 'IND06', null, { lastLog: quiet(7) }),
        ],
        carriedOver: {
            openAlerts: [{ pondId: 'p02', title: 'Low DO', severity: 'watch', source: 'engine' }],
            overdueTasks: [],
            worstPrevious: null,
            moltPending: [],
            stalePonds: [founderStale],
        },
        ...over,
    });

/** Only 1 of 3 stocked ponds scored: the farm number must read as Incomplete. */
export const incompleteBrief = (over: Partial<DailyBrief> = {}): DailyBrief =>
    founderBrief({
        verdict: { band: 'incomplete', pondsGood: 1, pondsWatch: 0, pondsAttention: 0, pondsUnscored: 2, stockedPonds: 3, scoredStockedPonds: 1, weakestPondId: 'p01' },
        ponds: [pond('p01', 'P01', score(88)), pond('p02', 'P02', null, { lastLog: quiet(3) }), pond('ind06', 'IND06', null, { lastLog: quiet(7) })],
        carriedOver: {
            openAlerts: [],
            overdueTasks: [],
            worstPrevious: null,
            moltPending: [],
            stalePonds: [founderStale, { pondId: 'p02', daysSinceWater: 3, daysSinceAny: 3, severity: 'watch' }],
        },
        ...over,
    });
