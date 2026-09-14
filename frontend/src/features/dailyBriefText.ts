/**
 * Pure text + time helpers for the Daily Brief (screen, Home card, reminders).
 *
 * Every sentence a farmer reads is ONE i18n key with interpolation — never a
 * join of translated fragments — so Tamil, Hindi, Odia… keep their own word
 * order. Times are IST by explicit offset math, never device-local getters:
 * the backend's day is an IST day, and a phone set to another zone must still
 * put a 01:30 IST feed at hour 1.
 */
import type { Band, DailyBrief, DayScore, Reason, ScorePart } from '../api/dailyBrief';

export type T = (key: string, options?: Record<string, unknown>) => string;

export type BriefMode = 'morning' | 'soFar' | 'wrap' | 'report';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of an instant in IST. */
export const istDate = (d: Date = new Date()): string =>
    new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Fractional IST hour of an instant, 0 ≤ h < 24. */
export const istHour = (at: Date | string): number => {
    const ms = (typeof at === 'string' ? new Date(at) : at).getTime() + IST_OFFSET_MS;
    return (((ms % DAY_MS) + DAY_MS) % DAY_MS) / 3_600_000;
};

/** `YYYY-MM-DD` ± days, calendar math in UTC so no zone can shift it. */
export const shiftDate = (date: string, days: number): string => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** Earliest day the backend accepts. */
export const MIN_BRIEF_DATE = '2020-01-01';

/** Which way the page leans: today before 15:00, from 15:00, from 19:00, or a past day. */
export const briefMode = (date: string, now: Date = new Date()): BriefMode => {
    if (date !== istDate(now)) return 'report';
    const h = istHour(now);
    if (h < 15) return 'morning';
    if (h < 19) return 'soFar';
    return 'wrap';
};

/** "05:12" in IST, whatever zone the phone is set to. */
export const istTime = (at: Date | string): string => {
    const mins = Math.floor(istHour(at) * 60 + 1e-6);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};

/** A `YYYY-MM-DD` as a local-noon Date — safe to hand to locale date formatters and CalendarPicker. */
export const localNoon = (date: string): Date => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
};

/** x of an event on a ribbon `width` wide (IST hour placement). */
export const ribbonX = (at: Date | string, width: number): number => (istHour(at) / 24) * width;

/** A reading printed for a farmer: at most 2 decimals, no trailing zeros. */
export const fmtNum = (n: number): string =>
    String(Math.round(n * 100) / 100);

export const bandOf = (value: number): Band => (value >= 80 ? 'good' : value >= 60 ? 'watch' : 'attention');

export const pondNameMap = (brief: Pick<DailyBrief, 'ponds'>): Record<string, string> =>
    Object.fromEntries(brief.ponds.map((p) => [p.pondId, p.name]));

/** One reason, as a sentence. Falls back to the number-free form when the value is absent. */
export const reasonText = (r: Reason, t: T): string =>
    r.value == null
        ? t(`dailyBrief.reasonsShort.${r.code}`)
        : t(`dailyBrief.reasons.${r.code}`, {
              value: fmtNum(r.value),
              limit: r.limit == null ? '' : fmtNum(r.limit),
          });

/** The verdict sentence from the day's pond counts. */
export const verdictSentence = (brief: DailyBrief, t: T): string => {
    const v = brief.verdict;
    const scored = v.pondsGood + v.pondsWatch + v.pondsAttention;
    if (scored === 0) {
        return t(brief.isToday ? 'dailyBrief.verdict.noScoreToday' : 'dailyBrief.verdict.noScorePast');
    }
    const names = pondNameMap(brief);
    // The weakest pond is the one worth naming; fall back to the first one in the
    // worst band so a sentence never names a pond that is fine.
    const worstBand: Band = v.pondsAttention > 0 ? 'attention' : v.pondsWatch > 0 ? 'watch' : 'good';
    const fallback = brief.ponds.find((p) => p.score?.band === worstBand);
    const pond = (v.weakestPondId && names[v.weakestPondId]) || fallback?.name || '';

    if (scored === 1) {
        const key = worstBand === 'good' ? 'oneGood' : worstBand === 'watch' ? 'oneWatch' : 'oneAttention';
        return t(`dailyBrief.verdict.${key}`, { pond });
    }
    if (v.pondsAttention > 0) {
        if (v.pondsAttention === scored) return t('dailyBrief.verdict.allAttention', { count: scored });
        if (v.pondsAttention > 1) return t('dailyBrief.verdict.attentionMany', { count: v.pondsAttention, pond });
        if (v.pondsWatch > 0) return t('dailyBrief.verdict.attentionAndWatch', { count: v.pondsWatch, pond });
        return t('dailyBrief.verdict.attentionOthersSteady', { pond });
    }
    if (v.pondsWatch > 0) {
        if (v.pondsWatch === scored) return t('dailyBrief.verdict.allWatch', { count: scored });
        return t('dailyBrief.verdict.watchSome', { count: v.pondsWatch, pond });
    }
    return t('dailyBrief.verdict.allGood', { count: scored });
};

/** "5 ponds had too little logged to score", or null. A separate sentence, not a suffix. */
export const unscoredSentence = (brief: DailyBrief, t: T): string | null => {
    const v = brief.verdict;
    const scored = v.pondsGood + v.pondsWatch + v.pondsAttention;
    return scored > 0 && v.pondsUnscored > 0 ? t('dailyBrief.verdict.unscored', { count: v.pondsUnscored }) : null;
};

const listParts = (parts: ScorePart[], t: T): string =>
    parts.map((p) => t(`dailyBrief.parts.${p}`)).join(t('dailyBrief.score.listSeparator'));

/** "Based on water, feeding · health not logged". */
export const basedOnText = (score: DayScore, t: T): string =>
    score.missing.length
        ? t('dailyBrief.score.basedOnMissing', {
              parts: listParts(score.basedOn, t),
              missing: listParts(score.missing, t),
          })
        : t('dailyBrief.score.basedOn', { parts: listParts(score.basedOn, t) });

/** "Up 6 from the day before" / "Down 3…" / "Same as…", or null without a previous score. */
export const deltaText = (value: number, previous: number | null, t: T): string | null => {
    if (previous == null) return null;
    const d = value - previous;
    if (d === 0) return t('dailyBrief.score.sameAs');
    return t(d > 0 ? 'dailyBrief.score.upFrom' : 'dailyBrief.score.downFrom', { count: Math.abs(d) });
};

/** The single most useful thing to do next, for the Home card. */
export const topTodo = (brief: DailyBrief, t: T): string | null => {
    const names = pondNameMap(brief);
    const molt = brief.todo.moltItems.find((m) => m.status === 'pending' && m.priority === 'critical');
    if (molt) return t(`engines.lunar.item_${molt.key}`);
    const task = brief.todo.tasks.find((k) => k.status === 'open' || k.status === 'in_progress');
    const missing = brief.todo.missingLogs.find((m) => m.kinds.length > 0);
    if (missing) {
        const pond = names[missing.pondId] ?? '';
        const key = { water: 'logWaterIn', feed: 'logFeedIn', tray: 'checkTrayIn', mortality: 'logDeathsIn' }[missing.kinds[0]];
        // A task a person set outranks a routine log only when it is high priority.
        if (!task || task.priority !== 'high') return t(`dailyBrief.todo.${key}`, { pond });
    }
    return task?.title ?? null;
};
