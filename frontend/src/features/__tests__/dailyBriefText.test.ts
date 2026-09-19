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
    coverageSentence,
    staleSentence,
    verdictSentence,
    greetingText,
    storySentence,
    workLine,
    shiftLine,
} from '../dailyBriefText';
import { founderBrief, incompleteBrief, makeBrief, pond, score, storyItems } from '../__fixtures__/dailyBrief';

const t = i18n.t.bind(i18n) as any;
/** Every stocked pond scored unless the test says otherwise. */
const verdict = (v: Partial<ReturnType<typeof makeBrief>['verdict']>, over = {}) => {
    const scored = (v.pondsGood ?? 0) + (v.pondsWatch ?? 0) + (v.pondsAttention ?? 0);
    return verdictSentence(
        makeBrief({
            verdict: { band: 'good', pondsGood: 0, pondsWatch: 0, pondsAttention: 0, pondsUnscored: 0, stockedPonds: scored, scoredStockedPonds: scored, weakestPondId: 'p2', ...v },
            ...over,
        }),
        t,
    );
};

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
        expect(verdict({ pondsGood: 1, pondsAttention: 1, weakestPondId: null })).toBe('Pond 2 needs attention');
    });
    it('no score: today vs a past day', () => {
        expect(verdict({ pondsUnscored: 2 })).toBe('Not enough has been logged yet to judge today');
        expect(verdict({ pondsUnscored: 2 }, { isToday: false })).toBe('Too little was logged on this day to judge it');
    });
});

describe('coverage — stocked ponds are the denominator', () => {
    it("founder's case: 1 good + 1 watch of 3 stocked is not \"most ponds are steady\"", () => {
        const b = founderBrief();
        expect(verdictSentence(b, t)).toBe('P02 needs watching');
        expect(verdictSentence(b, t)).not.toMatch(/most/i);
        expect(coverageSentence(b, t)).toBe('Based on 2 of 3 stocked ponds');
    });
    it('"most" only with a real majority of stocked ponds', () => {
        expect(verdict({ pondsGood: 2, pondsWatch: 1, stockedPonds: 4, scoredStockedPonds: 3 })).toBe('Pond 2 needs watching');
        expect(verdict({ pondsGood: 3, pondsWatch: 1, stockedPonds: 5, scoredStockedPonds: 4 })).toBe('Most ponds are steady — Pond 2 needs watching');
        expect(verdict({ pondsGood: 2, pondsAttention: 1, stockedPonds: 4, scoredStockedPonds: 3 })).toBe('Pond 2 needs attention');
    });
    it('all scored ponds good but some stocked ponds unscored: never "All N ponds"', () => {
        expect(verdict({ pondsGood: 2, stockedPonds: 3, scoredStockedPonds: 2 })).toBe('The 2 ponds logged are doing well');
        expect(verdict({ pondsWatch: 2, stockedPonds: 3, scoredStockedPonds: 2 })).toBe('The 2 ponds logged need watching');
        expect(verdict({ pondsGood: 3 })).toBe('All 3 ponds are doing well');
    });
    it('zero scored with stocked ponds names the count, today and past', () => {
        expect(verdict({ pondsUnscored: 3, stockedPonds: 3, scoredStockedPonds: 0 })).toBe('None of your 3 stocked ponds were logged today');
        expect(verdict({ pondsUnscored: 3, stockedPonds: 3, scoredStockedPonds: 0 }, { isToday: false })).toBe(
            'None of your 3 stocked ponds were logged on this day',
        );
    });
    it('incomplete (1 of 3): names the pond and shows the coverage', () => {
        const b = incompleteBrief();
        expect(verdictSentence(b, t)).toBe('P01 is doing well');
        expect(coverageSentence(b, t)).toBe('Based on 1 of 3 stocked ponds');
    });
    it('no coverage line when every stocked pond scored', () => {
        expect(coverageSentence(makeBrief(), t)).toBeNull();
    });
    it('names the lapse of an unwatched pond', () => {
        const names = { ind06: 'IND06' };
        expect(staleSentence({ pondId: 'ind06', daysSinceWater: 7, daysSinceAny: 7, severity: 'critical' }, names, t)).toBe('IND06 — nothing logged for 7 days');
        expect(staleSentence({ pondId: 'ind06', daysSinceWater: 2, daysSinceAny: 0, severity: 'watch' }, names, t)).toBe('IND06 — no water test for 2 days');
    });
    it('the Home top to-do prefers a critical stale pond over everything', () => {
        const b = founderBrief({ todo: { tasks: [], missingLogs: [{ pondId: 'p02', kinds: ['feed'] }], moltItems: [{ pondId: 'p01', key: 'feed_cut', priority: 'critical', status: 'pending', route: 'FeedLog' }] } });
        expect(topTodo(b, t)).toBe('IND06 — nothing logged for 7 days');
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
        expect(topTodo(molt, t)).toBe('Cut feed 15–30% today (molt peak)');
        const none = makeBrief({ ponds: [pond('p1', 'Pond 1', score(90))], todo: { tasks: [], missingLogs: [], moltItems: [] } });
        expect(topTodo(none, t)).toBeNull();
    });
});

describe('greetingText (IST hour, first name)', () => {
    it('picks morning / afternoon / evening by the IST hour, whatever the device zone', () => {
        expect(greetingText(t, 'Ravi Kumar', null, new Date('2026-09-14T11:59:00+05:30'))).toBe('Good morning, Ravi');
        expect(greetingText(t, 'Ravi', null, new Date('2026-09-14T12:00:00+05:30'))).toBe('Good afternoon, Ravi');
        expect(greetingText(t, 'Ravi', null, new Date('2026-09-14T17:00:00+05:30'))).toBe('Good evening, Ravi');
        // 23:00 UTC is 04:30 IST the next day — still morning.
        expect(greetingText(t, 'Ravi', null, new Date('2026-09-14T23:00:00Z'))).toBe('Good morning, Ravi');
    });
    it('stands alone without a name, and a past day says how it went', () => {
        expect(greetingText(t, '', null, new Date('2026-09-14T08:00:00+05:30'))).toBe('Good morning');
        expect(greetingText(t, undefined, null, new Date('2026-09-14T20:00:00+05:30'))).toBe('Good evening');
        expect(greetingText(t, 'Ravi', 'Thu, 10 Sep')).toBe("Here's how Thu, 10 Sep went");
    });
});

describe('storySentence — every StoryCode', () => {
    const past = makeBrief({ isToday: false });
    const say = (code: string, b = past) => storyItems.filter((s) => s.code === code).map((s) => storySentence(s, b, t));

    it('phrases each code in English', () => {
        expect(say('issue_resolved')).toEqual(['Pond 2 at 05:10: Oxygen fell to 2.8 mg/L (should stay at 3 or above) — back to safe by 07:30']);
        expect(say('issue_open')).toEqual(['Pond 2 at 08:30: Ammonia was 1.2 mg/L (limit 0.5) — no safe reading after it']);
        expect(say('mortality_spike')).toEqual(['140 shrimp died in Pond 1 — far more than usual']);
        expect(say('carried_resolved')).toEqual(['Overdue task done: Clean aerator', 'Pond 1 was logged again after going unwatched']);
        expect(say('carried_open')).toEqual(['Alert still open: Low DO', 'Pond 2 not yet back to safe after the day before: pH reached 9, past the safe limit of 8.5']);
        expect(say('stale_pond')).toEqual(['Pond 1 has gone 3 days without a log']);
        expect(say('harvest_done')).toEqual(['850 kg harvested from Pond 1']);
        expect(say('sampling_done')).toEqual(['Pond 1 sampled — average 12.4 g']);
        expect(say('first_sampling')).toEqual(['First sampling of the crop in Pond 2 — average 3.1 g']);
        expect(say('treatment_given')).toEqual(['Pond 2 was given 2 treatments']);
        expect(say('molt_phase')).toEqual(['Molt peak — go easy on feed and handling']);
        expect(say('team_in')).toEqual(['4 people checked in']);
        expect(say('all_ponds_fed')).toEqual(['All 2 stocked ponds were fed']);
        expect(say('all_ponds_tested')).toEqual(['Water was tested in all 2 stocked ponds']);
        expect(say('ponds_not_fed')).toEqual(['1 pond was not fed']);
        expect(say('ponds_not_tested')).toEqual(['2 ponds had no water test']);
        expect(say('tasks_all_done')).toEqual(['All 3 tasks were done']);
        expect(say('tasks_left')).toEqual(['2 tasks were left undone']);
        // Every code in the contract has a fixture, and none renders a raw key.
        storyItems.forEach((s) => expect(storySentence(s, past, t)).not.toMatch(/dailyBrief\./));
    });

    it('coverage reads "so far" on today only', () => {
        const today = makeBrief({ isToday: true });
        expect(say('all_ponds_fed', today)).toEqual(['All 2 stocked ponds fed so far']);
        expect(say('tasks_left', today)).toEqual(['2 tasks still to do']);
        expect(say('harvest_done', today)).toEqual(['850 kg harvested from Pond 1']);
    });
});

describe('workLine / shiftLine', () => {
    it('counts work compactly, feed by kg when weighed', () => {
        expect(workLine({ water: 3, feed: 4 }, 12.5, t, 2)).toBe('3 water tests · 12.5 kg feed · 2 tasks');
        expect(workLine({ feed: 1, tray: 1 }, 0, t)).toBe('1 feed entry · 1 tray check');
        expect(workLine({}, 0, t)).toBe('');
    });
    it('prints the shift in IST, or nothing', () => {
        expect(shiftLine({ checkIn: '2026-09-14T00:40:00Z', checkOut: '2026-09-14T12:30:00Z', hours: 11 + 50 / 60 }, t)).toBe('06:10–18:00 · 11 h 50 min');
        expect(shiftLine({ checkIn: '2026-09-14T00:40:00Z', checkOut: null, hours: null }, t)).toBe('In since 06:10');
        expect(shiftLine(null, t)).toBeNull();
    });
});
