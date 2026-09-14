import i18n from '../../i18n';
import {
    briefMode,
    istDate,
    istHour,
    istTime,
    reasonText,
    ribbonX,
    shiftDate,
    topTodo,
    unscoredSentence,
    verdictSentence,
} from '../dailyBriefText';
import { makeBrief, pond, score } from '../__fixtures__/dailyBrief';

const t = i18n.t.bind(i18n) as any;
const verdict = (v: Partial<ReturnType<typeof makeBrief>['verdict']>, over = {}) =>
    verdictSentence(makeBrief({ verdict: { band: 'good', pondsGood: 0, pondsWatch: 0, pondsAttention: 0, pondsUnscored: 0, weakestPondId: 'p2', ...v }, ...over }), t);

describe('IST time math — never the device zone', () => {
    it('places a 01:30 IST event at hour 1.5 (x for hour 1) whatever the phone is set to', () => {
        // 20:00 UTC on the 13th = 01:30 IST on the 14th.
        expect(istHour('2026-09-13T20:00:00Z')).toBeCloseTo(1.5);
        expect(ribbonX('2026-09-13T20:00:00Z', 240)).toBeCloseTo(15);
        expect(Math.floor(istHour('2026-09-13T20:00:00Z'))).toBe(1);
        expect(istTime('2026-09-13T20:00:00Z')).toBe('01:30');
    });

    it('places a DATE-only record (12:00 IST) at the middle of the ribbon', () => {
        expect(ribbonX('2026-09-14T06:30:00Z', 240)).toBeCloseTo(120);
    });

    it('rolls the IST calendar day at 18:30 UTC', () => {
        expect(istDate(new Date('2026-09-14T18:29:00Z'))).toBe('2026-09-14');
        expect(istDate(new Date('2026-09-14T18:30:00Z'))).toBe('2026-09-15');
    });

    it('shifts dates across month and year ends', () => {
        expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
        expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    });
});

describe('briefMode', () => {
    const at = (utc: string) => new Date(utc);
    it('morning before 15:00 IST, day so far from 15:00, wrap from 19:00, report for a past day', () => {
        expect(briefMode('2026-09-14', at('2026-09-14T09:29:00Z'))).toBe('morning'); // 14:59 IST
        expect(briefMode('2026-09-14', at('2026-09-14T09:30:00Z'))).toBe('soFar'); // 15:00 IST
        expect(briefMode('2026-09-14', at('2026-09-14T13:30:00Z'))).toBe('wrap'); // 19:00 IST
        expect(briefMode('2026-09-13', at('2026-09-14T03:00:00Z'))).toBe('report');
    });
});

describe('verdictSentence', () => {
    it('names the weakest pond when one needs attention and the rest are fine', () => {
        expect(verdict({ pondsGood: 3, pondsAttention: 1 })).toBe('Most ponds are steady — Pond 2 needs attention');
    });
    it('counts ponds needing attention with a plural', () => {
        expect(verdict({ pondsGood: 1, pondsAttention: 2 })).toBe('2 ponds need attention — start with Pond 2');
    });
    it('mentions ponds to watch alongside one needing attention', () => {
        expect(verdict({ pondsAttention: 1, pondsWatch: 1, pondsGood: 1 })).toBe('Pond 2 needs attention, and 1 more pond needs watching');
        expect(verdict({ pondsAttention: 1, pondsWatch: 3 })).toBe('Pond 2 needs attention, and 3 more ponds need watching');
    });
    it('all good / all watch / single pond', () => {
        expect(verdict({ pondsGood: 4 })).toBe('All 4 ponds are doing well');
        expect(verdict({ pondsWatch: 2 })).toBe('All 2 ponds need watching');
        expect(verdict({ pondsWatch: 1, weakestPondId: 'p1' })).toBe('Pond 1 needs watching');
    });
    it('watching some, singular names the pond', () => {
        expect(verdict({ pondsGood: 2, pondsWatch: 1 })).toBe('Most ponds are steady — Pond 2 needs watching');
    });
    it('never names a pond that is fine when the weakest id is missing', () => {
        expect(verdict({ pondsGood: 1, pondsAttention: 1, weakestPondId: null })).toBe('Most ponds are steady — Pond 2 needs attention');
    });
    it('no score: today vs a past day', () => {
        expect(verdict({ pondsUnscored: 2 })).toBe('Not enough has been logged yet to judge today');
        expect(verdict({ pondsUnscored: 2 }, { isToday: false })).toBe('Too little was logged on this day to judge it');
    });
    it('keeps the unscored count as its own sentence', () => {
        const b = makeBrief({ verdict: { band: 'good', pondsGood: 2, pondsWatch: 0, pondsAttention: 0, pondsUnscored: 1, weakestPondId: null } });
        expect(unscoredSentence(b, t)).toBe('1 pond had too little logged to score');
    });
    it('uses whole translated sentences in another language', async () => {
        await i18n.changeLanguage('ta');
        try {
            expect(verdict({ pondsGood: 3, pondsAttention: 1 })).toBe('பெரும்பாலான குளங்கள் சீராக உள்ளன — Pond 2-க்கு கவனம் தேவை');
        } finally {
            await i18n.changeLanguage('en');
        }
    });
});

describe('reasonText / topTodo', () => {
    it('interpolates value and limit, and falls back when there is no value', () => {
        expect(reasonText({ code: 'do_low', severity: 'critical', value: 2.8333, limit: 3 }, t)).toBe('Oxygen fell to 2.83 mg/L (should stay at 3 or above)');
        expect(reasonText({ code: 'do_low', severity: 'critical' }, t)).toBe('Oxygen fell too low');
    });
    it('puts a critical molt step first, then a missing log', () => {
        const b = makeBrief();
        expect(topTodo(b, t)).toBe('Log feed in Pond 2');
        const molt = makeBrief({ todo: { ...b.todo, moltItems: [{ pondId: 'p1', key: 'feed_cut', priority: 'critical', status: 'pending', route: 'FeedLog' }] } });
        expect(topTodo(molt, t)).toBe('Cut feed 15–30% on peak days');
        const none = makeBrief({ ponds: [pond('p1', 'Pond 1', score(90))], todo: { tasks: [], missingLogs: [], moltItems: [] } });
        expect(topTodo(none, t)).toBeNull();
    });
});
