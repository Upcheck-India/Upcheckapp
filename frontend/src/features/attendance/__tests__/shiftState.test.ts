import {
    expectedEnd,
    recordState,
    farmCard,
    headcount,
    formatDuration,
    shiftLine,
    recordStatus,
    onLeaveToday,
    isTodayIST,
    parseShiftEnd,
    type FarmCard,
} from '../shiftState';

/** An IST wall-clock instant, whatever zone the test machine is in. */
const ist = (s: string) => `${s}:00+05:30`;
const at = (s: string) => new Date(ist(s));

const rec = (checkIn: string, checkOut: string | null = null, over: any = {}): any => ({
    id: `r-${checkIn}`,
    farmId: 'f1',
    userId: 'u1',
    checkInAt: new Date(ist(checkIn)).toISOString(),
    checkOutAt: checkOut ? new Date(ist(checkOut)).toISOString() : null,
    createdAt: '',
    ...over,
});

const FARM_18 = { shiftEndLocal: '18:00', shiftHours: 9 };
const NO_END = { shiftEndLocal: null, shiftHours: 9 };

// Echoes key + opts so assertions read the values that went in.
const t = (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k);
const hhmm = (d: string | Date) => {
    const x = new Date(new Date(d).getTime() + 5.5 * 3_600_000);
    return x.toISOString().slice(11, 16);
};
const fmt = { t, time: hhmm, day: () => 'Mon 13 Sep' };

describe('parseShiftEnd', () => {
    it('reads HH:MM and HH:MM:SS, rejects junk', () => {
        expect(parseShiftEnd('18:00')).toBe(1080);
        expect(parseShiftEnd('07:30:00')).toBe(450);
        expect(parseShiftEnd('25:00')).toBeNull();
        expect(parseShiftEnd('')).toBeNull();
        expect(parseShiftEnd(null)).toBeNull();
    });
});

describe('expectedEnd (B.1)', () => {
    it('uses the farm end time on the IST day of check-in', () => {
        expect(expectedEnd(rec('2026-09-14T09:12').checkInAt, FARM_18).toISOString()).toBe(
            at('2026-09-14T18:00').toISOString(),
        );
    });

    it('an early-morning IST check-in (previous UTC day) still ends that IST day', () => {
        // 04:00 IST = 22:30Z on the 13th.
        expect(expectedEnd(rec('2026-09-14T04:00').checkInAt, FARM_18).toISOString()).toBe(
            at('2026-09-14T18:00').toISOString(),
        );
    });

    it('late arrival (within 1 h of end, or after) falls back to check-in + shiftHours', () => {
        expect(expectedEnd(rec('2026-09-14T17:00').checkInAt, FARM_18).toISOString()).toBe(
            at('2026-09-15T02:00').toISOString(),
        );
        expect(expectedEnd(rec('2026-09-14T16:59').checkInAt, FARM_18).toISOString()).toBe(
            at('2026-09-14T18:00').toISOString(),
        );
        expect(expectedEnd(rec('2026-09-14T20:00').checkInAt, { shiftEndLocal: '18:00', shiftHours: 4 }).toISOString()).toBe(
            at('2026-09-15T00:00').toISOString(),
        );
    });

    it('no farm setting → check-in + 9 h; bad hours → 9 h', () => {
        expect(expectedEnd(rec('2026-09-14T06:00').checkInAt, NO_END).toISOString()).toBe(at('2026-09-14T15:00').toISOString());
        expect(expectedEnd(rec('2026-09-14T06:00').checkInAt, undefined).toISOString()).toBe(at('2026-09-14T15:00').toISOString());
        expect(expectedEnd(rec('2026-09-14T06:00').checkInAt, { shiftHours: 0 }).toISOString()).toBe(at('2026-09-14T15:00').toISOString());
    });
});

describe('recordState (B.2 table, in order)', () => {
    const r = rec('2026-09-14T09:00');
    it.each([
        ['2026-09-14T09:10', 'just_in'],
        ['2026-09-14T09:29', 'just_in'],
        ['2026-09-14T09:30', 'on_shift'],
        ['2026-09-14T16:59', 'on_shift'],
        ['2026-09-14T17:00', 'due_soon'],
        ['2026-09-14T17:59', 'due_soon'],
        ['2026-09-14T18:00', 'overdue'],
        ['2026-09-14T23:59', 'overdue'],
        ['2026-09-15T00:00', 'forgot'],
    ])('at %s IST → %s', (now, state) => {
        expect(recordState(r, FARM_18, at(now))).toBe(state);
    });

    it('forgot beats overdue even minutes after IST midnight', () => {
        expect(recordState(rec('2026-09-14T23:50'), NO_END, at('2026-09-15T00:05'))).toBe('forgot');
    });

    it('a 00:30 IST check-in is today, not yesterday (UTC would say 13th)', () => {
        expect(recordState(rec('2026-09-14T00:30'), NO_END, at('2026-09-14T01:00'))).toBe('on_shift');
        expect(isTodayIST(rec('2026-09-14T00:30').checkInAt, at('2026-09-14T23:59'))).toBe(true);
        expect(isTodayIST(rec('2026-09-13T23:59').checkInAt, at('2026-09-14T00:00'))).toBe(false);
    });

    it('just_in loses to due_soon when checking in close to the end', () => {
        // 16:30 is before 17:00, so due 18:00; at 16:40 that is 80 min away — just in.
        expect(recordState(rec('2026-09-14T16:30'), FARM_18, at('2026-09-14T16:40'))).toBe('just_in');
        // A 1-hour shift checked in 10 min ago is due within the hour.
        expect(recordState(rec('2026-09-14T09:00'), { shiftHours: 1 }, at('2026-09-14T09:10'))).toBe('due_soon');
    });

    it('closed → out', () => {
        expect(recordState(rec('2026-09-14T09:00', '2026-09-14T17:00'), FARM_18, at('2026-09-14T18:00'))).toBe('out');
    });
});

describe('farmCard', () => {
    const now = at('2026-09-14T12:00');

    it('open today → in, with the record and its expected end', () => {
        const c = farmCard([rec('2026-09-14T09:00')], FARM_18, now);
        expect(c.state).toBe('on_shift');
        expect(c.bucket).toBe('in');
        expect(c.expectedEnd?.toISOString()).toBe(at('2026-09-14T18:00').toISOString());
    });

    it('closed today → out with today\'s worked total across shifts', () => {
        const c = farmCard(
            [rec('2026-09-14T06:00', '2026-09-14T08:00'), rec('2026-09-14T09:00', '2026-09-14T11:30')],
            FARM_18,
            now,
        );
        expect(c.state).toBe('out');
        expect(c.bucket).toBe('out');
        expect(c.workedMs).toBe(4.5 * 3_600_000);
        expect(c.record?.checkOutAt).toBe(new Date(ist('2026-09-14T11:30')).toISOString());
    });

    it('a forgotten shift from yesterday is shown, but does not count them in today', () => {
        const c = farmCard([rec('2026-09-13T06:10')], FARM_18, now);
        expect(c.state).toBe('forgot');
        expect(c.bucket).toBe('notIn');
    });

    it('legacy: forgot + today open → shows forgot, bucket in', () => {
        const c = farmCard([rec('2026-09-14T09:00'), rec('2026-09-13T06:10')], FARM_18, now);
        expect(c.state).toBe('forgot');
        expect(c.bucket).toBe('in');
    });

    it('closed today but open again → the open one wins', () => {
        const c = farmCard([rec('2026-09-14T06:00', '2026-09-14T08:00'), rec('2026-09-14T11:50')], FARM_18, now);
        expect(c.state).toBe('just_in');
        expect(c.bucket).toBe('in');
    });

    it('leave with no record → on_leave; nothing → not_in', () => {
        expect(farmCard([], FARM_18, now, true)).toMatchObject({ state: 'on_leave', bucket: 'leave' });
        expect(farmCard([], FARM_18, now)).toMatchObject({ state: 'not_in', bucket: 'notIn', record: null });
    });

    it('a record today beats leave', () => {
        expect(farmCard([rec('2026-09-14T09:00')], FARM_18, now, true).bucket).toBe('in');
    });
});

describe('onLeaveToday', () => {
    const leave = (over: any) => ({ userId: 'u1', farmId: 'f1', status: 'approved', startDate: '2026-09-13', endDate: '2026-09-14', ...over });
    it('covers today on the IST day, approved only, right person and farm', () => {
        const now = at('2026-09-15T00:10'); // UTC is still the 14th
        expect(onLeaveToday([leave({})] as any, 'u1', 'f1', now)).toBe(false);
        expect(onLeaveToday([leave({ endDate: '2026-09-15' })] as any, 'u1', 'f1', now)).toBe(true);
        expect(onLeaveToday([leave({ endDate: '2026-09-15', status: 'pending' })] as any, 'u1', 'f1', now)).toBe(false);
        expect(onLeaveToday([leave({ endDate: '2026-09-15' })] as any, 'u2', 'f1', now)).toBe(false);
        expect(onLeaveToday(undefined, 'u1', 'f1', now)).toBe(false);
    });
});

describe('headcount', () => {
    const card = (state: FarmCard['state'], bucket: FarmCard['bucket']): FarmCard =>
        ({ state, bucket, record: null, expectedEnd: null, workedMs: 0 });

    it('dedupes by user on the best bucket: in > out > leave > not in', () => {
        const h = headcount([
            { userId: 'a', card: card('out', 'out') },
            { userId: 'a', card: card('on_shift', 'in') }, // two farms, one person
            { userId: 'b', card: card('not_in', 'notIn') },
            { userId: 'b', card: card('on_leave', 'leave') },
            { userId: 'c', card: card('forgot', 'notIn') },
            { userId: 'd', card: card('overdue', 'in') },
            { userId: 'e', card: card('out', 'out') },
        ]);
        expect(h).toEqual({ in: 2, out: 1, leave: 1, notIn: 1, total: 5, late: 2 });
    });

    it('is all zero for nobody', () => {
        expect(headcount([])).toEqual({ in: 0, out: 0, leave: 0, notIn: 0, total: 0, late: 0 });
    });
});

describe('formatDuration', () => {
    it('h + min over an hour, min under, floors, never negative', () => {
        expect(formatDuration(3 * 3_600_000 + 20 * 60_000 + 59_000, t)).toBe('team.durationHm {"h":3,"m":20}');
        expect(formatDuration(40 * 60_000, t)).toBe('team.durationM {"m":40}');
        expect(formatDuration(60 * 60_000, t)).toBe('team.durationHm {"h":1,"m":0}');
        expect(formatDuration(-5, t)).toBe('team.durationM {"m":0}');
    });
});

describe('shiftLine', () => {
    it('writes each state\'s sentence with the right values', () => {
        const r = rec('2026-09-14T09:12');
        expect(shiftLine(farmCard([r], FARM_18, at('2026-09-14T12:32')), at('2026-09-14T12:32'), fmt)).toBe(
            'team.shiftLine_onShift {"since":"09:12","elapsed":"team.durationHm {\\"h\\":3,\\"m\\":20}","due":"18:00"}',
        );
        expect(shiftLine(farmCard([r], FARM_18, at('2026-09-14T17:20')), at('2026-09-14T17:20'), fmt)).toBe(
            'team.shiftLine_dueSoon {"due":"18:00","in":"team.durationM {\\"m\\":40}"}',
        );
        expect(shiftLine(farmCard([r], FARM_18, at('2026-09-14T19:10')), at('2026-09-14T19:10'), fmt)).toBe(
            'team.shiftLine_overdue {"due":"18:00","by":"team.durationHm {\\"h\\":1,\\"m\\":10}"}',
        );
        expect(shiftLine(farmCard([r], FARM_18, at('2026-09-14T09:20')), at('2026-09-14T09:20'), fmt)).toBe(
            'team.shiftLine_justIn {"time":"09:12"}',
        );
        const y = rec('2026-09-13T06:10');
        expect(shiftLine(farmCard([y], FARM_18, at('2026-09-14T09:00')), at('2026-09-14T09:00'), fmt)).toBe(
            'team.shiftLine_forgot {"since":"Mon 13 Sep 06:10"}',
        );
        const closed = rec('2026-09-14T09:12', '2026-09-14T17:55');
        expect(shiftLine(farmCard([closed], FARM_18, at('2026-09-14T18:00')), at('2026-09-14T18:00'), fmt)).toBe(
            'team.shiftLine_out {"time":"17:55","total":"team.durationHm {\\"h\\":8,\\"m\\":43}"}',
        );
        expect(shiftLine(farmCard([], FARM_18, at('2026-09-14T18:00'), true), at('2026-09-14T18:00'), fmt)).toBe('team.shift_onLeave');
        expect(shiftLine(farmCard([], FARM_18, at('2026-09-14T18:00')), at('2026-09-14T18:00'), fmt)).toBe('team.shift_notIn');
    });
});

describe('recordStatus (export)', () => {
    const now = at('2026-09-14T20:00');
    it('still in today, forgot from an earlier day', () => {
        expect(recordStatus(rec('2026-09-14T09:00'), FARM_18, now)).toBe('stillIn');
        expect(recordStatus(rec('2026-09-13T09:00'), FARM_18, now)).toBe('forgot');
    });
    it('auto-closed and forgot reasons win over timing', () => {
        expect(recordStatus(rec('2026-09-14T09:00', '2026-09-14T19:00', { checkOutReason: 'auto_closed' }), FARM_18, now)).toBe('autoClosed');
        expect(recordStatus(rec('2026-09-14T09:00', '2026-09-14T10:00', { checkOutReason: 'forgot' }), FARM_18, now)).toBe('forgot');
    });
    it('on time up to the expected end, overdue after', () => {
        expect(recordStatus(rec('2026-09-14T09:00', '2026-09-14T18:00'), FARM_18, now)).toBe('onTime');
        expect(recordStatus(rec('2026-09-14T09:00', '2026-09-14T18:01'), FARM_18, now)).toBe('overdue');
    });
});
