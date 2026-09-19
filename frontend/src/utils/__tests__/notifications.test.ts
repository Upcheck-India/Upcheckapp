const mockSchedule = jest.fn().mockResolvedValue('id');
const mockCancel = jest.fn().mockResolvedValue(undefined);
const mockGetAll = jest.fn().mockResolvedValue([]);
const mockGetPermissions = jest.fn().mockResolvedValue({ status: 'granted' });
const mockRequestPermissions = jest.fn().mockResolvedValue({ status: 'granted' });

// The mock*, functions are called through a deferred wrapper (rather than
// assigned directly) because babel-plugin-jest-hoist hoists this jest.mock()
// call above the ES `import` below it, but does NOT hoist the `const mock… =`
// declarations above it — only the static "may reference a mock-prefixed
// name" check is exempted, not the runtime ordering. notifications.ts imports
// 'expo-notifications' too, so requiring it (via the `import` a few lines
// down) runs this factory before the consts are assigned; wrapping each call
// in an arrow function defers the mockX reference until the test actually
// invokes it, by which point the assignment above has run.
jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
    cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancel(...args),
    getAllScheduledNotificationsAsync: (...args: unknown[]) => mockGetAll(...args),
    getPermissionsAsync: (...args: unknown[]) => mockGetPermissions(...args),
    requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
    getExpoPushTokenAsync: jest.fn(),
    AndroidImportance: { MAX: 5 },
    SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
}));
jest.mock('expo-device', () => ({ isDevice: true }));

import type { PondContext } from '../../api/pondContext';
import {
    syncReminders,
    getReminderStatus,
    syncBriefReminders,
    syncMoltReminders,
    moltReminderWindows,
    MOLT_REMINDER_TAG,
    BRIEF_REMINDER_TAG,
    DEFAULT_REMINDER_TIMES,
} from '../notifications';

const ctx = (over: Partial<PondContext>): PondContext =>
    ({
        pondId: 'p1', farmId: 'f1', cropId: 'c1', species: null, areaM2: null,
        installedAeratorHp: null, doc: 10, waterQuality: null,
        freeAmmoniaMgL: null, abwG: null, livePopulation: null, biomassKg: null,
        crop: null, cumulativeFeedKg: null, runningFcr: null,
        latestTrayResidue: null, lastFeedAt: null, lastTrayAt: null,
        samplingAt: null,
        confidence: { score: 0, band: 'low', missing: [], stale: [] },
        ...over,
    }) as PondContext;

const wqAt = (recordedAt: string) =>
    ({ dissolvedOxygen: 6, ph: 8, temperature: 30, salinity: 15,
       ammonia: null, nitrite: null, nitrate: null, alkalinity: null,
       recordedAt, chemistryAsOf: null }) as PondContext['waterQuality'];

/** Slot tags of every notification scheduled in this call. */
const scheduledSlots = () =>
    mockSchedule.mock.calls.map((c) => (c[0].content.data as any).slot);

beforeEach(() => {
    mockSchedule.mockClear();
    mockCancel.mockClear();
    mockGetAll.mockResolvedValue([]);
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
});

/**
 * A local notification can only be made conditional when it is SCHEDULED, never
 * when it fires — nothing of ours runs at fire time. So the three repeating
 * DAILY triggers became a rolling window of one-shots, re-armed on foreground
 * and after every log, and a slot already satisfied is simply not scheduled.
 */
describe('syncReminders', () => {
    const now = new Date('2026-09-02T05:00:00');

    it('schedules a slot nobody has logged', async () => {
        await syncReminders([ctx({ waterQuality: null })], DEFAULT_REMINDER_TIMES, now);
        expect(scheduledSlots()).toContain('morning');
    });

    it('skips today’s morning once every pond has logged it', async () => {
        await syncReminders(
            [ctx({ pondId: 'a', waterQuality: wqAt('2026-09-02T05:30:00') })],
            DEFAULT_REMINDER_TIMES,
            new Date('2026-09-02T06:00:00'),
        );
        const morningToday = mockSchedule.mock.calls.filter((c) => {
            const d = c[0].content.data as any;
            const when: Date = c[0].trigger.date;
            return d.slot === 'morning' && when.getDate() === 2;
        });
        expect(morningToday).toHaveLength(0);
    });

    // Decision D6 — one outstanding pond keeps the reminder alive.
    it('still reminds when only some ponds are logged', async () => {
        await syncReminders(
            [
                ctx({ pondId: 'a', waterQuality: wqAt('2026-09-02T05:30:00') }),
                ctx({ pondId: 'b', waterQuality: null }),
            ],
            DEFAULT_REMINDER_TIMES,
            new Date('2026-09-02T06:00:00'),
        );
        const morningToday = mockSchedule.mock.calls.filter((c) => {
            const d = c[0].content.data as any;
            const when: Date = c[0].trigger.date;
            return d.slot === 'morning' && when.getDate() === 2;
        });
        expect(morningToday).toHaveLength(1);
    });

    it('clears the previous window before re-arming, so syncing twice does not duplicate', async () => {
        mockGetAll.mockResolvedValue([
            { identifier: 'old-1', content: { data: { tag: 'wq-reminder' } } },
            { identifier: 'keep-me', content: { data: { tag: 'something-else' } } },
        ]);
        await syncReminders([ctx({})], DEFAULT_REMINDER_TIMES, now);
        expect(mockCancel).toHaveBeenCalledWith('old-1');
        expect(mockCancel).not.toHaveBeenCalledWith('keep-me');
    });

    it('arms a rolling multi-day window', async () => {
        await syncReminders([ctx({ waterQuality: null })], DEFAULT_REMINDER_TIMES, now);
        // WINDOW_DAYS x 3 daily slots + the weekly chemistry one, and never
        // more than iOS's hard cap of 64 pending local notifications.
        expect(mockSchedule.mock.calls.length).toBeGreaterThanOrEqual(21);
        expect(mockSchedule.mock.calls.length).toBeLessThanOrEqual(64);
    });

    it('schedules nothing at all for an account with no ponds', async () => {
        await syncReminders([], DEFAULT_REMINDER_TIMES, now);
        expect(mockSchedule).not.toHaveBeenCalled();
    });

    /**
     * THE BUG THE FARMER REPORTED. `/alert-center/today` only returns contexts
     * for ponds with a RUNNING CYCLE, so a farmer between crops — or one who
     * has ponds but has never started a crop — got `contexts: []` and, before
     * this, zero reminders. A fallow pond still needs its water tested.
     */
    it('arms the window for a farmer with ponds but no active cycle', async () => {
        await syncReminders([], DEFAULT_REMINDER_TIMES, now, true);
        expect(scheduledSlots()).toContain('morning');
        expect(scheduledSlots()).toContain('chemistry');
    });

    it('does not leave zero scheduled when the context fetch came back empty', async () => {
        mockGetAll.mockResolvedValue([
            { identifier: 'old-1', content: { data: { tag: 'wq-reminder' } } },
        ]);
        await syncReminders([], DEFAULT_REMINDER_TIMES, now, true);
        expect(mockCancel).toHaveBeenCalledWith('old-1');
        expect(mockSchedule.mock.calls.length).toBeGreaterThan(0);
    });

    /**
     * Without an explicit channelId, Android drops a scheduled notification on
     * Expo's fallback "Miscellaneous" channel — which the farmer may have
     * muted independently of the channel they were actually asked about.
     */
    it('puts every reminder on the app notification channel', async () => {
        await syncReminders([ctx({ waterQuality: null })], DEFAULT_REMINDER_TIMES, now);
        expect(mockSchedule.mock.calls.length).toBeGreaterThan(0);
        for (const [req] of mockSchedule.mock.calls) {
            expect(req.trigger.channelId).toBe('default');
        }
    });

    it('schedules nothing when notification permission is denied', async () => {
        mockGetPermissions.mockResolvedValue({ status: 'denied' });
        mockRequestPermissions.mockResolvedValue({ status: 'denied' });
        await syncReminders([ctx({ waterQuality: null })], DEFAULT_REMINDER_TIMES, now);
        expect(mockSchedule).not.toHaveBeenCalled();
    });

    /**
     * The regression these two pin.
     *
     * cancelOurs() used to run BEFORE the permission and hasPonds guards, and
     * syncReminders runs on every app foreground. So one transient condition —
     * a permission not yet answered, /ponds/mine momentarily empty or failing —
     * wiped every reminder the farmer had and scheduled none back. Nothing
     * rearmed them until a later launch happened to satisfy both guards, and
     * from the farmer's side reminders had simply stopped, with no explanation
     * and nothing on screen.
     *
     * Bailing out must leave the existing window ALONE. Those notifications
     * were correct when scheduled; a stale reminder is a far smaller failure
     * than silence.
     */
    it('does not wipe the existing window when permission is denied', async () => {
        // Seed an existing window, or cancelOurs() has nothing to cancel and
        // the assertion below would pass whether or not the bug is present.
        mockGetAll.mockResolvedValue([
            { identifier: 'existing-1', content: { data: { tag: 'wq-reminder' } } },
        ]);
        mockGetPermissions.mockResolvedValue({ status: 'denied' });
        mockRequestPermissions.mockResolvedValue({ status: 'denied' });
        await syncReminders([ctx({ waterQuality: null })], DEFAULT_REMINDER_TIMES, now);
        expect(mockCancel).not.toHaveBeenCalled();
    });

    it('does not wipe the existing window when the pond list is momentarily empty', async () => {
        // hasPonds=false is the "/ponds/mine returned nothing this time" case,
        // which a flaky rural connection produces regularly.
        // Seed an existing window, or cancelOurs() has nothing to cancel and
        // the assertion below would pass whether or not the bug is present.
        mockGetAll.mockResolvedValue([
            { identifier: 'existing-1', content: { data: { tag: 'wq-reminder' } } },
        ]);
        await syncReminders([], DEFAULT_REMINDER_TIMES, now, false);
        expect(mockCancel).not.toHaveBeenCalled();
        expect(mockSchedule).not.toHaveBeenCalled();
    });
});

describe('getReminderStatus', () => {
    it('reports a denied permission rather than pretending reminders are armed', async () => {
        mockGetPermissions.mockResolvedValue({ status: 'denied' });
        mockGetAll.mockResolvedValue([]);
        expect(await getReminderStatus()).toEqual({
            permission: 'denied',
            scheduled: 0,
            next: null,
        });
    });

    it('counts only our own reminders and reports the next one', async () => {
        mockGetAll.mockResolvedValue([
            { identifier: 'a', content: { data: { tag: 'wq-reminder' } }, trigger: { type: 'date', value: 2_000 } },
            { identifier: 'b', content: { data: { tag: 'chem-reminder' } }, trigger: { type: 'date', value: 1_000 } },
            { identifier: 'c', content: { data: { tag: 'something-else' } }, trigger: { type: 'date', value: 500 } },
        ]);
        const status = await getReminderStatus();
        expect(status.permission).toBe('granted');
        expect(status.scheduled).toBe(2);
        expect(status.next?.getTime()).toBe(1_000);
    });
});

describe('syncBriefReminders', () => {
    /** Keep a fake OS queue so a second call sees what the first scheduled. */
    let queue: any[];
    beforeEach(() => {
        queue = [{ identifier: 'wq', content: { data: { tag: 'wq-reminder' } } }];
        let n = 0;
        mockGetAll.mockImplementation(async () => [...queue]);
        mockSchedule.mockImplementation(async (req: any) => {
            const id = `b${n++}`;
            queue.push({ identifier: id, ...req });
            return id;
        });
        mockCancel.mockImplementation(async (id: string) => {
            queue = queue.filter((q) => q.identifier !== id);
        });
    });
    afterEach(() => {
        mockGetAll.mockReset().mockResolvedValue([]);
        mockSchedule.mockReset().mockResolvedValue('id');
        mockCancel.mockReset().mockResolvedValue(undefined);
    });

    const brief = () => queue.filter((q) => q.content?.data?.tag === BRIEF_REMINDER_TAG);

    it('schedules exactly a 06:00 and a 19:00 daily reminder, however often it runs', async () => {
        await syncBriefReminders(true);
        await syncBriefReminders(true);
        await syncBriefReminders(true);
        expect(brief()).toHaveLength(2);
        expect(brief().map((q) => [q.trigger.type, q.trigger.hour, q.trigger.minute])).toEqual([
            ['daily', 6, 0],
            ['daily', 19, 0],
        ]);
        expect(brief()[0].content.title).toBe('Your morning brief is ready');
        // Never touches the water-check reminders.
        expect(queue.some((q) => q.identifier === 'wq')).toBe(true);
    });

    it('clears only its own reminders when turned off', async () => {
        await syncBriefReminders(true);
        await syncBriefReminders(false);
        expect(brief()).toHaveLength(0);
        expect(queue.map((q) => q.identifier)).toEqual(['wq']);
    });

    it('never asks for permission, and leaves the queue alone without it', async () => {
        mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
        mockRequestPermissions.mockClear();
        await syncBriefReminders(true);
        expect(mockRequestPermissions).not.toHaveBeenCalled();
        expect(mockSchedule).not.toHaveBeenCalled();
    });
});

describe('molt reminder (M1.4: only with an eligible pond)', () => {
    type Win = { key: string; kind: 'new' | 'full'; preStart: string };
    const W: Win = { key: '2026-09-26-full', kind: 'full', preStart: '2026-09-23' };
    const NEXT: Win = { key: '2026-10-11-new', kind: 'new', preStart: '2026-10-08' };
    const NOW = new Date('2026-09-19T06:00:00Z');

    it('windows only when ≥ 1 pond is eligible', () => {
        expect(moltReminderWindows({ window: null, next: W, eligiblePonds: 1 })).toEqual([W]);
        expect(moltReminderWindows({ window: W, next: NEXT, eligiblePonds: 2 })).toEqual([W, NEXT]);
        expect(moltReminderWindows({ window: W, next: NEXT, eligiblePonds: 0 })).toEqual([]);
        expect(moltReminderWindows({ window: W, next: NEXT })).toEqual([]);
    });

    it('schedules one per window, and with none eligible cancels what was armed', async () => {
        await syncMoltReminders(moltReminderWindows({ window: null, next: W, eligiblePonds: 1 }), NOW);
        expect(mockSchedule).toHaveBeenCalledTimes(1);
        expect(mockSchedule.mock.calls[0][0].content.data).toEqual({ tag: MOLT_REMINDER_TAG, windowKey: W.key });

        mockSchedule.mockClear();
        mockGetAll.mockResolvedValue([{ identifier: 'm1', content: { data: { tag: MOLT_REMINDER_TAG } } }]);
        await syncMoltReminders(moltReminderWindows({ window: null, next: W, eligiblePonds: 0 }), NOW);
        expect(mockCancel).toHaveBeenCalledWith('m1');
        expect(mockSchedule).not.toHaveBeenCalled();
    });
});
