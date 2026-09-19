import { routeForNotification } from '../notificationRouting';

describe('routeForNotification', () => {
    // The payload says `reportId`; the navigator (RootNavigator:222) declares
    // `FeedbackDetail: { id: string }`. This asserts the translation, because
    // passing `reportId` through would navigate with a param the screen never
    // reads and open an empty report.
    it('routes a support reply to the report it answers, in the navigator\'s param shape', () => {
        expect(routeForNotification({ type: 'feedback_reply', reportId: 'r-9' }))
            .toEqual({ screen: 'FeedbackDetail', params: { id: 'r-9' } });
    });

    it('ignores a reminder, which has no destination of its own', () => {
        expect(routeForNotification({ tag: 'wq-reminder', slot: 'morning' })).toBeNull();
    });

    it('opens the Daily Brief on the IST day the brief reminder is tapped', () => {
        // 19:30 UTC on the 14th is 01:00 IST on the 15th.
        expect(routeForNotification({ tag: 'brief-reminder', slot: 'wrap' }, new Date('2026-09-14T19:30:00Z')))
            .toEqual({ screen: 'DailyBrief', params: { date: '2026-09-15' } });
    });

    it('ignores an unknown or malformed payload rather than crashing', () => {
        expect(routeForNotification({})).toBeNull();
        expect(routeForNotification({ type: 'feedback_reply' })).toBeNull();
        expect(routeForNotification(null)).toBeNull();
        expect(routeForNotification(undefined)).toBeNull();
        expect(routeForNotification({ type: 'feedback_reply', reportId: 42 })).toBeNull();
    });

    it('routes a pending-join push to the farm team screen', () => {
        expect(routeForNotification({ type: 'pending_join', farmId: 'f1' })).toEqual({
            screen: 'FarmMembers',
            params: { farmId: 'f1' },
        });
    });

    it('routes a leave-request push to the leave screen', () => {
        expect(routeForNotification({ type: 'leave_request', farmId: 'f1', leaveRequestId: 'lr1' })).toEqual({
            screen: 'LeaveRequests',
            params: { farmId: 'f1' },
        });
    });

    it('ignores pending_join / leave_request payloads missing a farmId', () => {
        expect(routeForNotification({ type: 'pending_join' })).toBeNull();
        expect(routeForNotification({ type: 'leave_request' })).toBeNull();
    });
});

describe('molt reminder routing (M1.4)', () => {
    it('opens the Lunar pond list', () => {
        expect(routeForNotification({ tag: 'molt-reminder', windowKey: '2026-09-26-full' })).toEqual({
            screen: 'Lunar',
            params: {},
        });
    });
});
