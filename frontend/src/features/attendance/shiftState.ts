/**
 * Where someone is on their shift — spec 2026-09-14 attendance B.1/B.2.
 *
 * Pure, `now` injected. Every day boundary is the IST day (the backend's), by
 * explicit offset math: a phone set to another zone must still call a 04:00
 * IST check-in "today". Shared by the Team tab, the roster, Home and the
 * attendance export, so the four can never disagree about who is "in".
 */
import type { AttendanceRecord } from '../../api/attendance';
import type { LeaveRequest } from '../../api/leaveRequests';
import { istDate, istHour } from '../dailyBriefText';

/** In rule order (B.2): the first that matches wins. */
export const SHIFT_STATES = [
    'forgot', 'overdue', 'due_soon', 'just_in', 'on_shift', 'out', 'on_leave', 'not_in',
] as const;
export type ShiftState = (typeof SHIFT_STATES)[number];

/** The four headcount columns. Best first: in > out > leave > not in. */
export type Bucket = 'in' | 'out' | 'leave' | 'notIn';
const BUCKETS: Bucket[] = ['in', 'out', 'leave', 'notIn'];

/** Founder Q8. */
export const DUE_SOON_MS = 60 * 60_000;
export const JUST_IN_MS = 30 * 60_000;
/** Founder Q4: no farm end time → check-in + 9 h. */
export const DEFAULT_SHIFT_HOURS = 9;

export interface ShiftFarm {
    /** IST wall clock 'HH:MM' (a pg `time` may arrive as 'HH:MM:SS'). */
    shiftEndLocal?: string | null;
    shiftHours?: number | null;
}

/** IST `YYYY-MM-DD` of an ISO instant. */
export const istDay = (iso: string): string => istDate(new Date(iso));

export const isTodayIST = (iso: string | null | undefined, now: Date = new Date()): boolean =>
    !!iso && istDay(iso) === istDate(now);

/** 'HH:MM' → minutes since midnight, or null. */
export const parseShiftEnd = (v: string | null | undefined): number | null => {
    const m = v ? /^([01]?\d|2[0-3]):([0-5]\d)/.exec(v) : null;
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * B.1: the farm's end time on the check-in's IST day, unless they arrived
 * within an hour of it (or after) — then check-in + shiftHours.
 */
export const expectedEnd = (checkInAt: string, farm?: ShiftFarm | null): Date => {
    const inMs = Date.parse(checkInAt);
    const endMin = parseShiftEnd(farm?.shiftEndLocal);
    if (endMin != null && istHour(checkInAt) * 60 < endMin - 60) {
        return new Date(Date.parse(`${istDay(checkInAt)}T00:00:00+05:30`) + endMin * 60_000);
    }
    const hours = farm?.shiftHours && farm.shiftHours > 0 ? farm.shiftHours : DEFAULT_SHIFT_HOURS;
    return new Date(inMs + hours * 3_600_000);
};

/** One record's state. A closed record is `out`. */
export const recordState = (r: AttendanceRecord, farm: ShiftFarm | null | undefined, now: Date): ShiftState => {
    if (r.checkOutAt) return 'out';
    if (istDay(r.checkInAt) < istDate(now)) return 'forgot';
    const t = now.getTime();
    const end = expectedEnd(r.checkInAt, farm).getTime();
    if (t >= end) return 'overdue';
    if (t >= end - DUE_SOON_MS) return 'due_soon';
    if (t - Date.parse(r.checkInAt) < JUST_IN_MS) return 'just_in';
    return 'on_shift';
};

const rank = (s: ShiftState) => SHIFT_STATES.indexOf(s);

export const onLeaveToday = (
    leave: LeaveRequest[] | undefined,
    userId: string,
    farmId: string,
    now: Date,
): boolean => {
    const today = istDate(now);
    return (leave ?? []).some(
        (l) =>
            l.userId === userId &&
            l.farmId === farmId &&
            l.status === 'approved' &&
            l.startDate.slice(0, 10) <= today &&
            l.endDate.slice(0, 10) >= today,
    );
};

export interface FarmCard {
    state: ShiftState;
    bucket: Bucket;
    /** The open record the state is about, else today's last closed one. */
    record: AttendanceRecord | null;
    /** Only for an open record. */
    expectedEnd: Date | null;
    /** Today's closed time, for `out`. */
    workedMs: number;
}

/**
 * One person on one farm. `records` must already be that person's on that
 * farm (today's and any still open). Several open ones (legacy data from before
 * the one-open-record rule) → the most urgent is shown, so a forgotten shift
 * gets fixed rather than hidden behind today's.
 *
 * The bucket is decided on today alone: a forgotten shift from Monday does not
 * make someone "in" on Tuesday.
 */
export const farmCard = (
    records: AttendanceRecord[],
    farm: ShiftFarm | null | undefined,
    now: Date,
    onLeave = false,
): FarmCard => {
    const today = records.filter((r) => isTodayIST(r.checkInAt, now));
    const bucket: Bucket = today.some((r) => !r.checkOutAt)
        ? 'in'
        : today.length
          ? 'out'
          : onLeave
            ? 'leave'
            : 'notIn';

    const open = records
        .filter((r) => !r.checkOutAt)
        .map((r) => ({ r, s: recordState(r, farm, now) }))
        .sort((a, b) => rank(a.s) - rank(b.s) || b.r.checkInAt.localeCompare(a.r.checkInAt));
    if (open.length) {
        const { r, s } = open[0];
        return { state: s, bucket, record: r, expectedEnd: expectedEnd(r.checkInAt, farm), workedMs: 0 };
    }
    if (today.length) {
        const last = [...today].sort((a, b) => String(b.checkOutAt).localeCompare(String(a.checkOutAt)))[0];
        const workedMs = today.reduce(
            (sum, r) => sum + Math.max(0, Date.parse(r.checkOutAt as string) - Date.parse(r.checkInAt)),
            0,
        );
        return { state: 'out', bucket, record: last, expectedEnd: null, workedMs };
    }
    return { state: onLeave ? 'on_leave' : 'not_in', bucket, record: null, expectedEnd: null, workedMs: 0 };
};

export interface Headcount {
    in: number;
    out: number;
    leave: number;
    notIn: number;
    total: number;
    /** People with a forgotten or overdue check-out. */
    late: number;
}

/** Deduped by user on their best bucket — someone on two farms is one person. */
export const headcount = (people: { userId: string; card: FarmCard }[]): Headcount => {
    const best = new Map<string, { bucket: Bucket; late: boolean }>();
    for (const { userId, card } of people) {
        const prev = best.get(userId);
        const late = card.state === 'forgot' || card.state === 'overdue';
        best.set(userId, {
            bucket: !prev || BUCKETS.indexOf(card.bucket) < BUCKETS.indexOf(prev.bucket) ? card.bucket : prev.bucket,
            late: late || !!prev?.late,
        });
    }
    const out: Headcount = { in: 0, out: 0, leave: 0, notIn: 0, total: best.size, late: 0 };
    for (const v of best.values()) {
        out[v.bucket] += 1;
        if (v.late) out.late += 1;
    }
    return out;
};

// ── Words ────────────────────────────────────────────────────────────────

export type TFn = (key: string, opts?: Record<string, unknown>) => string;

export const BADGE_KEY: Record<ShiftState, string> = {
    forgot: 'team.shift_forgot',
    overdue: 'team.shift_overdue',
    due_soon: 'team.shift_dueSoon',
    just_in: 'team.shift_justIn',
    on_shift: 'team.shift_onShift',
    out: 'team.shift_out',
    on_leave: 'team.shift_onLeave',
    not_in: 'team.shift_notIn',
};

/** "3 h 20 min", or "40 min" under an hour. Floors; never negative. */
export const formatDuration = (ms: number, t: TFn): string => {
    const mins = Math.max(0, Math.floor(ms / 60_000));
    const h = Math.floor(mins / 60);
    return h > 0 ? t('team.durationHm', { h, m: mins % 60 }) : t('team.durationM', { m: mins });
};

export interface LineFormat {
    t: TFn;
    time: (d: string | Date) => string;
    day: (d: string | Date) => string;
}

/** The sentence under the badge (B.2 column 3). */
export const shiftLine = (card: FarmCard, now: Date, f: LineFormat): string => {
    const { t } = f;
    const r = card.record;
    const end = card.expectedEnd;
    const since = r ? f.time(r.checkInAt) : '';
    switch (card.state) {
        case 'forgot':
            return t('team.shiftLine_forgot', { since: `${f.day(r!.checkInAt)} ${since}` });
        case 'overdue':
            return t('team.shiftLine_overdue', { due: f.time(end!), by: formatDuration(now.getTime() - end!.getTime(), t) });
        case 'due_soon':
            return t('team.shiftLine_dueSoon', { due: f.time(end!), in: formatDuration(end!.getTime() - now.getTime(), t) });
        case 'just_in':
            return t('team.shiftLine_justIn', { time: since });
        case 'on_shift':
            return t('team.shiftLine_onShift', {
                since,
                elapsed: formatDuration(now.getTime() - Date.parse(r!.checkInAt), t),
                due: f.time(end!),
            });
        case 'out':
            return t('team.shiftLine_out', { time: f.time(r!.checkOutAt as string), total: formatDuration(card.workedMs, t) });
        default:
            return t(BADGE_KEY[card.state]);
    }
};

/** Export status of one record (B.7). */
export type RecordStatus = 'onTime' | 'overdue' | 'forgot' | 'autoClosed' | 'stillIn';

export const recordStatus = (r: AttendanceRecord, farm: ShiftFarm | null | undefined, now: Date): RecordStatus => {
    if (!r.checkOutAt) return istDay(r.checkInAt) < istDate(now) ? 'forgot' : 'stillIn';
    if (r.checkOutReason === 'auto_closed') return 'autoClosed';
    if (r.checkOutReason === 'forgot') return 'forgot';
    // ponytail: strict — any check-out after the expected end is "overdue", no grace. Add one if farms ask.
    return Date.parse(r.checkOutAt) > expectedEnd(r.checkInAt, farm).getTime() ? 'overdue' : 'onTime';
};
