/**
 * Pure text + time helpers for the Daily Brief (screen, Home card, reminders).
 *
 * Every sentence a farmer reads is ONE i18n key with interpolation — never a
 * join of translated fragments — so Tamil, Hindi, Odia… keep their own word
 * order. Times are IST by explicit offset math, never device-local getters:
 * the backend's day is an IST day, and a phone set to another zone must still
 * put a 01:30 IST feed at hour 1.
 */
import type { Band, DailyBrief, DayScore, PersonDay, Reason, ScorePart, StalePond, StoryCode, StoryItem, WorkKind } from '../api/dailyBrief';

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

/**
 * The verdict sentence from the day's pond counts. Every farm-level claim counts
 * STOCKED ponds (spec addendum): "most" needs more than half of them good, and
 * "all" needs every one of them scored — an unlogged pond never vanishes.
 */
export const verdictSentence = (brief: DailyBrief, t: T): string => {
    const v = brief.verdict;
    const scored = v.pondsGood + v.pondsWatch + v.pondsAttention;
    // A copy cached before the coverage fields existed counts only what was scored.
    const stocked = Math.max(v.stockedPonds ?? 0, scored);
    if (scored === 0) {
        if (stocked > 0) {
            return t(brief.isToday ? 'dailyBrief.verdict.noneLoggedToday' : 'dailyBrief.verdict.noneLoggedPast', { count: stocked });
        }
        return t(brief.isToday ? 'dailyBrief.verdict.noScoreToday' : 'dailyBrief.verdict.noScorePast');
    }
    const names = pondNameMap(brief);
    // The weakest pond is the one worth naming; fall back to the first one in the
    // worst band so a sentence never names a pond that is fine.
    const worstBand: Band = v.pondsAttention > 0 ? 'attention' : v.pondsWatch > 0 ? 'watch' : 'good';
    const fallback = brief.ponds.find((p) => p.score?.band === worstBand);
    const pond = (v.weakestPondId && names[v.weakestPondId]) || fallback?.name || '';
    const every = scored === stocked;
    const most = v.pondsGood > stocked / 2;

    if (scored === 1) {
        const key = worstBand === 'good' ? 'oneGood' : worstBand === 'watch' ? 'oneWatch' : 'oneAttention';
        return t(`dailyBrief.verdict.${key}`, { pond });
    }
    if (v.pondsAttention > 0) {
        if (v.pondsAttention === scored) {
            return t(every ? 'dailyBrief.verdict.allAttention' : 'dailyBrief.verdict.loggedAttention', { count: scored });
        }
        if (v.pondsAttention > 1) return t('dailyBrief.verdict.attentionMany', { count: v.pondsAttention, pond });
        if (v.pondsWatch > 0) return t('dailyBrief.verdict.attentionAndWatch', { count: v.pondsWatch, pond });
        return t(most ? 'dailyBrief.verdict.attentionOthersSteady' : 'dailyBrief.verdict.oneAttention', { pond });
    }
    if (v.pondsWatch > 0) {
        if (v.pondsWatch === scored) return t(every ? 'dailyBrief.verdict.allWatch' : 'dailyBrief.verdict.loggedWatch', { count: scored });
        // watchSome_one says "Most ponds are steady", so it needs a real majority.
        if (v.pondsWatch === 1 && !most) return t('dailyBrief.verdict.oneWatch', { pond });
        return t('dailyBrief.verdict.watchSome', { count: v.pondsWatch, pond });
    }
    return t(every ? 'dailyBrief.verdict.allGood' : 'dailyBrief.verdict.loggedGood', { count: scored });
};

/** "Based on 2 of 3 stocked ponds", or null when every stocked pond was scored (or none was). */
export const coverageSentence = (brief: DailyBrief, t: T): string | null => {
    const { stockedPonds, scoredStockedPonds } = brief.verdict;
    return stockedPonds > 0 && scoredStockedPonds > 0 && scoredStockedPonds < stockedPonds
        ? t('dailyBrief.verdict.coverage', { scored: scoredStockedPonds, count: stockedPonds })
        : null;
};

/**
 * Which lapse to name for an unwatched pond: nothing at all logged, or no water
 * test. Water days are never fewer than any-log days, so "nothing" is named only
 * when the two agree — the pond went fully quiet.
 */
export const staleLapse = (s: StalePond): { kind: 'nothing' | 'water'; days: number } =>
    s.daysSinceAny != null && s.daysSinceAny >= 3 && (s.daysSinceWater == null || s.daysSinceWater === s.daysSinceAny)
        ? { kind: 'nothing', days: s.daysSinceAny }
        : { kind: 'water', days: s.daysSinceWater ?? s.daysSinceAny ?? 0 };

/** "IND06 — nothing logged for 7 days" / "IND06 — no water test for 2 days". */
export const staleSentence = (s: StalePond, names: Record<string, string>, t: T): string => {
    const { kind, days } = staleLapse(s);
    return t(kind === 'nothing' ? 'dailyBrief.carried.staleNothing' : 'dailyBrief.carried.staleWater', {
        pond: names[s.pondId] ?? '',
        count: days,
    });
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

/**
 * "Good morning, Ravi" by the IST hour (before 12, before 17, then evening);
 * without a name the greeting stands alone. A past day: "Here's how Thu, 10 Sep went".
 */
export const greetingText = (t: T, name: string | null | undefined, pastDateLabel: string | null, now: Date = new Date()): string => {
    if (pastDateLabel) return t('dailyBrief.greeting.past', { date: pastDateLabel });
    const h = istHour(now);
    const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const first = (name ?? '').trim().split(/\s+/)[0];
    return first ? t(`dailyBrief.greeting.${part}`, { name: first }) : t(`dailyBrief.greeting.${part}Anon`);
};

/** Coverage lines read "so far" on today. */
const SO_FAR: StoryCode[] = ['all_ponds_fed', 'all_ponds_tested', 'ponds_not_fed', 'ponds_not_tested', 'tasks_all_done', 'tasks_left'];

/** One story item as one sentence (the backend sends codes; every language phrases it). */
export const storySentence = (item: StoryItem, brief: Pick<DailyBrief, 'ponds' | 'isToday'>, t: T): string => {
    const pond = item.pondId ? pondNameMap(brief)[item.pondId] ?? '' : '';
    const opts = {
        pond,
        count: item.count ?? 1,
        value: item.value == null ? '' : fmtNum(item.value),
        time: item.at ? istTime(item.at) : '',
        resolved: item.resolvedAt ? istTime(item.resolvedAt) : '',
        reason: item.reason ? reasonText(item.reason, t) : '',
        title: item.title ?? '',
    };
    switch (item.code) {
        case 'molt_phase':
            return t(`dailyBrief.happening.moltPhase.${item.phase ?? 'peak'}`);
        case 'antimicrobial_watch':
            // `at` is a calendar day here, not an instant.
            return t('dailyBrief.story.antimicrobial_watch', {
                pond,
                date: item.at ? localNoon(item.at.slice(0, 10)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '',
            });
        case 'carried_resolved':
        case 'carried_open':
            return t(`dailyBrief.story.${item.code}_${item.carriedKind ?? 'alert'}`, opts);
        default:
            return t(`dailyBrief.${brief.isToday && SO_FAR.includes(item.code) ? 'storySoFar' : 'story'}.${item.code}`, opts);
    }
};

const WORK_ORDER: WorkKind[] = ['water', 'feed', 'tray', 'mortality', 'sampling', 'harvest', 'treatment', 'chemical'];

/** "3 water tests · 12.5 kg feed · 2 tasks" — feed by kg when weighed, else by entries. */
export const workLine = (counts: Partial<Record<WorkKind, number>>, feedKg: number, t: T, tasksDone = 0): string =>
    [
        ...WORK_ORDER.flatMap((k) => {
            const n = counts[k] ?? 0;
            if (k === 'feed' && feedKg > 0) return [t('dailyBrief.done.feedKg', { kg: fmtNum(feedKg) })];
            return n > 0 ? [t(`dailyBrief.done.work.${k}`, { count: n })] : [];
        }),
        ...(tasksDone > 0 ? [t('dailyBrief.done.tasksCount', { count: tasksDone })] : []),
    ].join(' · ');

/** "06:10–18:00 · 11 h 50 min", "In since 06:10", or null without a shift. */
export const shiftLine = (shift: PersonDay['shift'], t: T): string | null => {
    if (!shift?.checkIn) return null;
    const from = istTime(shift.checkIn);
    if (!shift.checkOut) return t('dailyBrief.done.inSince', { time: from });
    const mins = Math.round((shift.hours ?? (new Date(shift.checkOut).getTime() - new Date(shift.checkIn).getTime()) / 3_600_000) * 60);
    return t('dailyBrief.done.shift', { from, to: istTime(shift.checkOut), h: Math.floor(mins / 60), m: mins % 60 });
};

/** The single most useful thing to do next, for the Home card. */
export const topTodo = (brief: DailyBrief, t: T): string | null => {
    const names = pondNameMap(brief);
    // A pond nobody has looked at for a week outranks everything else.
    const stale = (brief.carriedOver.stalePonds ?? []).find((p) => p.severity === 'critical');
    if (stale) return staleSentence(stale, names, t);
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
