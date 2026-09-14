const mockPrint = jest.fn(async () => ({ uri: 'file:///print/x.pdf' }));
const mockWrite = jest.fn();
const mockMove = jest.fn();
const mockShareAsync = jest.fn(async () => undefined);
const mockCanShare = jest.fn(async () => true);

jest.mock('../../../api/client', () => ({ __esModule: true, default: {} }));
jest.mock('expo-print', () => ({ printToFileAsync: (...a: unknown[]) => mockPrint(...(a as [])) }));
jest.mock('expo-file-system', () => ({
    Paths: { cache: 'file:///cache/' },
    File: jest.fn().mockImplementation((dir: string, name?: string) => ({
        uri: name ? `file:///cache/${name}` : dir,
        exists: false,
        create: jest.fn(),
        write: mockWrite,
        delete: jest.fn(),
        move: mockMove,
    })),
}));
jest.mock('expo-sharing', () => ({
    __esModule: true,
    shareAsync: (...a: unknown[]) => mockShareAsync(...(a as [])),
    isAvailableAsync: () => mockCanShare(),
}));

import type { DailyBrief, DayScore } from '../../../api/dailyBrief';
import { renderReportHtml } from '../pdf/renderReportHtml';
import {
    buildDayCardModel,
    buildDayReportData,
    registerDayCardHost,
    shareDayCardImage,
    wrapText,
    CARD_W,
    CARD_H,
} from '../dayReport';

const score = (over: Partial<DayScore> = {}): DayScore => ({
    value: 72,
    band: 'watch',
    capped: false,
    capReasons: [],
    parts: {
        water: { earned: 30, possible: 40, measured: true },
        feeding: { earned: 14, possible: 20, measured: true },
        health: { earned: 0, possible: 25, measured: false },
        care: { earned: 12, possible: 15, measured: true },
    },
    basedOn: ['water', 'feeding', 'care'],
    missing: ['health'],
    reasons: [],
    ...over,
});

const fixture = (over: Partial<DailyBrief> = {}): DailyBrief => ({
    date: '2026-09-13',
    isToday: false,
    generatedAt: '2026-09-14T00:00:00Z',
    farm: { id: 'f1', name: 'Green <Acres>' },
    farms: [{ id: 'f1', name: 'Green <Acres>' }],
    canViewFinancials: true,
    hasAnyData: true,
    score: score(),
    previousScore: 70,
    verdict: { band: 'watch', pondsGood: 1, pondsWatch: 1, pondsAttention: 0, pondsUnscored: 0, stockedPonds: 2, scoredStockedPonds: 2, weakestPondId: 'p2' },
    ponds: [
        {
            pondId: 'p2', name: 'Pond 3', farmId: 'f1', cycleActive: true, doc: 41, score: score(), previousScore: 70,
            water: {
                tests: 2, do: { min: 3.8, max: 5, last: 4, zone: 'caution' }, ph: { min: 7.6, max: 8.2, last: 8, zone: 'optimal', swing: 0.6 },
                temperature: null, salinity: null, alkalinity: null, ammonia: null, freeNh3: null, nitrite: null,
            },
            feed: { kg: 42.5, prev3DayAvgKg: 40, sessions: [], trayWorst: 'few_left' },
            health: { mortality: 12, mortalityPct: 0.01, mortality7DayAvg: 5, abwG: 8, biomassKg: 900, livePopulation: 110000, treatments: 0 },
            molt: null,
            lastLog: { waterDate: '2026-09-13', feedDate: '2026-09-13', anyDate: '2026-09-13', daysSinceWater: 0, daysSinceFeed: 0, daysSinceAny: 0 },
        },
    ],
    timeline: [],
    carriedOver: {
        openAlerts: [{ pondId: 'p2', title: 'Low DO', severity: 'critical', source: 'engine' }],
        overdueTasks: [],
        worstPrevious: null,
        moltPending: [],
        stalePonds: [],
    },
    todo: {
        tasks: [
            { id: 't1', title: 'Lime pond', status: 'done', priority: null, dueDate: '2026-09-13', timeWindowStart: null, pondId: 'p2', assigneeNames: [] },
            { id: 't2', title: 'Check aerator', status: 'open', priority: null, dueDate: '2026-09-13', timeWindowStart: null, pondId: null, assigneeNames: [] },
        ],
        missingLogs: [{ pondId: 'p2', kinds: ['mortality'] }],
        moltItems: [],
    },
    happening: { molt: null, harvestsPlanned: [], milestones: [], lowStock: [], attendance: { present: 3, total: 4 } },
    totals: {
        feedKg: 42.5, feedKgPrev: 40, mortality: 12, mortalityPrev: 20, waterTests: 2, samplings: 0,
        harvestKg: 0, treatments: 0, spend: 1500, income: 90000,
    },
    ...over,
});

const labels = (d: Awaited<ReturnType<typeof buildDayReportData>>) => d.stats.map((s) => s.label);
const table = (d: Awaited<ReturnType<typeof buildDayReportData>>, title: string) => d.tables.find((tb) => tb.title === title);

beforeEach(() => {
    jest.clearAllMocks();
    mockCanShare.mockResolvedValue(true);
});

describe('buildDayReportData', () => {
    it('builds score, parts, ponds, to-dos, carried over and money for a financial viewer', async () => {
        const d = await buildDayReportData(fixture(), 'en', new Date('2026-09-14T06:00:00Z'));
        expect(d.meta.documentTitle).toBe('Day report');
        expect(d.meta.farmName).toBe('Green <Acres>');
        expect(d.stats[0]).toMatchObject({ label: 'Day score', value: '72/100', hint: 'Watch' });
        expect(labels(d)).toEqual(expect.arrayContaining(['Spent', 'Income']));
        expect(table(d, 'Score parts')?.rows[2]).toEqual(['Health', '—', 'Not logged']);
        expect(table(d, 'Ponds')?.rows[0]).toEqual(['Pond 3', '41', '72 · Watch', '3.8', '7.6–8.2', '42.5', '12']);
        // Past day: an unfinished task and an unlogged record are "Missed".
        expect(table(d, 'To do')?.rows).toEqual([
            ['Lime pond', 'Pond 3', 'Done'],
            ['Check aerator', '—', 'Missed'],
            ['Deaths log', 'Pond 3', 'Missed'],
        ]);
        expect(table(d, 'Carried over')?.rows).toEqual([['Low DO', 'Pond 3', 'Critical']]);
        expect(table(d, 'Happening')?.rows).toEqual([['Attendance', '—', '3 / 4']]);

        const html = renderReportHtml(d, 'en');
        expect(html).toContain('Green &lt;Acres&gt;');
        expect(html).toContain('Score parts');
    });

    it('hides money without VIEW_FINANCIALS even if the payload carries it', async () => {
        const d = await buildDayReportData(fixture({ canViewFinancials: false }), 'en');
        expect(labels(d)).not.toContain('Spent');
        expect(labels(d)).not.toContain('Income');
        expect(renderReportHtml(d, 'en')).not.toContain('90,000');
    });

    it('says "No score" and why, and drops the parts table, on an unscored day', async () => {
        const d = await buildDayReportData(fixture({ score: null, farm: null }), 'en');
        expect(d.meta.farmName).toBe('All farms');
        expect(d.stats[0]).toMatchObject({ label: 'Day score', value: 'No score' });
        expect(table(d, 'Score parts')).toBeUndefined();
        expect(table(d, 'How the day went')?.rows[1][1]).toContain('No water test or feed was logged');
    });

    it('lists the cap reasons on a capped day', async () => {
        const capped = score({ value: 59, band: 'attention', capped: true, capReasons: [{ code: 'do_low', severity: 'critical', value: 2.4, limit: 3 }] });
        const d = await buildDayReportData(fixture({ score: capped }), 'en');
        const row = table(d, 'How the day went')?.rows.find((r) => r[0] === 'Held at 59 because');
        expect(row).toBeDefined();
        expect(row?.[1]).not.toBe('—');
    });

    it('an incomplete day prints "Incomplete" with the coverage, and stale ponds lead carried over', async () => {
        const b = fixture({
            score: score({ value: 88, band: 'good' }),
            verdict: { band: 'incomplete', pondsGood: 1, pondsWatch: 0, pondsAttention: 0, pondsUnscored: 2, stockedPonds: 3, scoredStockedPonds: 1, weakestPondId: 'p2' },
            carriedOver: { ...fixture().carriedOver, stalePonds: [{ pondId: 'p2', daysSinceWater: 7, daysSinceAny: 7, severity: 'critical' }] },
        });
        const d = await buildDayReportData(b, 'en');
        expect(d.stats[0]).toMatchObject({ value: '88/100', hint: 'Incomplete' });
        const summary = table(d, 'How the day went')?.rows ?? [];
        expect(summary).toContainEqual(['Day score', '88/100 · Incomplete']);
        expect(summary).toContainEqual(['Ponds counted', 'Based on 1 of 3 stocked ponds']);
        expect(JSON.stringify(summary)).not.toContain('Good');
        expect(table(d, 'Carried over')?.rows).toEqual([
            ['Pond not being logged — critical', 'Pond 3', 'Nothing logged for 7 days'],
            ['Low DO', 'Pond 3', 'Critical'],
        ]);

        const card = buildDayCardModel(b, 'en');
        expect(card.band).toBe('Incomplete');
        expect(card.colors.border).not.toBe('#27A855');
        expect(card.scoreNote.join(' ')).toContain('Based on 1 of 3 stocked ponds');
    });

    it('translates into the document language', async () => {
        const d = await buildDayReportData(fixture(), 'ta');
        expect(d.meta.documentTitle).toBe('நாள் அறிக்கை');
    });
});

describe('wrapText', () => {
    it('wraps and truncates with an ellipsis', () => {
        const lines = wrapText('one two three four five six seven eight nine ten', 50, 300, 2);
        expect(lines).toHaveLength(2);
        expect(lines[1].endsWith('…')).toBe(true);
        lines.forEach((l) => expect(Array.from(l).length).toBeLessThanOrEqual(Math.floor(300 / (50 * 0.56))));
    });

    it('fits fewer characters per line for Indic scripts', () => {
        const ta = 'நாள் அறிக்கை நாள் அறிக்கை நாள் அறிக்கை';
        const perLine = Math.floor(600 / (40 * 0.68));
        wrapText(ta, 40, 600, 5).forEach((l) => expect(Array.from(l).length).toBeLessThanOrEqual(perLine));
    });
});

describe('shareDayCardImage', () => {
    let unregister: (() => void) | undefined;
    afterEach(() => unregister?.());

    it('builds a card model with the weakest pond and 4 headline numbers', () => {
        const m = buildDayCardModel(fixture(), 'en');
        expect(m).toMatchObject({ appName: 'Neerani', farm: 'Green <Acres>', score: '72', hasScore: true, band: 'Watch' });
        expect(m.numbers.map((n) => n.value)).toEqual(['42.5', '12', '2', '0']);
        expect(m.weakest.join(' ')).toContain('Pond 3');
        expect(buildDayCardModel(fixture({ score: null }), 'en')).toMatchObject({ score: 'No score', hasScore: false });
    });

    it('shares a 1080x1350 PNG from the mounted host', async () => {
        const ref = { toDataURL: jest.fn((cb: (b: string) => void) => cb('iVBOR\nw0K')) };
        unregister = registerDayCardHost(async () => ref);
        await shareDayCardImage(fixture(), 'en');
        expect(ref.toDataURL).toHaveBeenCalledWith(expect.any(Function), { width: CARD_W, height: CARD_H });
        expect(mockWrite).toHaveBeenCalledWith('iVBORw0K', { encoding: 'base64' });
        expect(mockShareAsync).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), expect.objectContaining({ mimeType: 'image/png' }));
        expect(mockPrint).not.toHaveBeenCalled();
    });

    it('falls back to the PDF when toDataURL throws', async () => {
        unregister = registerDayCardHost(async () => ({ toDataURL: () => { throw new Error('boom'); } }));
        await shareDayCardImage(fixture(), 'en');
        expect(mockPrint).toHaveBeenCalledTimes(1);
        expect(mockShareAsync).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/), expect.objectContaining({ mimeType: 'application/pdf' }));
    });

    it('falls back to the PDF when the host never answers', async () => {
        jest.useFakeTimers();
        try {
            unregister = registerDayCardHost(() => new Promise(() => undefined));
            const done = shareDayCardImage(fixture(), 'en');
            await jest.advanceTimersByTimeAsync(10_000);
            await done;
            expect(mockPrint).toHaveBeenCalledTimes(1);
        } finally {
            jest.useRealTimers();
        }
    });

    it('falls back to the PDF when no renderer is mounted', async () => {
        await shareDayCardImage(fixture(), 'en');
        expect(mockPrint).toHaveBeenCalledTimes(1);
        expect(mockWrite).not.toHaveBeenCalled();
    });
});
