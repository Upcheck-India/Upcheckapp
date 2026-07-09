// TEST-1 — end-to-end offline→online lifecycle: queue while offline, token
// expiry mid-offline, reconnect, drain, dedupe. This is the area with the most
// blockers (AUTH-1/SYNC-1/-2/-3/-4) and previously the least coverage.
jest.mock('expo-crypto', () => ({ randomUUID: () => 'op-uuid-1' }));
jest.mock('../../api/client', () => ({
    __esModule: true,
    default: { post: jest.fn(), request: jest.fn() },
}));

import apiClient from '../../api/client';
import { useSyncStore } from '../../store/syncStore';
import { saveRecord, replayQueuedOp, drainRecordQueue } from '../recordSync';

const mockedPost = (apiClient as any).post as jest.Mock;
const mockedRequest = (apiClient as any).request as jest.Mock;

describe('offline→online record lifecycle (TEST-1)', () => {
    beforeEach(() => {
        useSyncStore.getState().clearQueue();
        useSyncStore.getState().setConnected(true);
        jest.clearAllMocks();
    });

    it('queues offline, survives an expired token on reconnect, then syncs once — no data loss, no duplicate', async () => {
        // 1. Offline: optimistic save → queued locally, nothing sent.
        useSyncStore.getState().setConnected(false);
        const r = await saveRecord({ entity: 'feed', endpoint: '/feed-records', payload: { pondId: 'p1', quantityKg: 5 } });
        expect(r.queued).toBe(true);
        expect(useSyncStore.getState().queue).toHaveLength(1);

        // 2. Reconnect, but the access token expired while offline → first drain
        //    hits 401. The backlog must be PRESERVED (SYNC-1), not dropped.
        useSyncStore.getState().setConnected(true);
        mockedRequest.mockRejectedValueOnce({ response: { status: 401 } });
        await drainRecordQueue();
        expect(useSyncStore.getState().queue).toHaveLength(1);            // kept
        expect(useSyncStore.getState().failedOperations).toHaveLength(0); // not parked
        expect(useSyncStore.getState().queue[0].retryCount).toBe(1);

        // 3. Token refreshed; next drain succeeds → op removed.
        mockedRequest.mockResolvedValueOnce({ data: { id: 'op-uuid-1' } });
        useSyncStore.getState().setStatus('online');
        await drainRecordQueue();
        expect(useSyncStore.getState().queue).toHaveLength(0);
        expect(useSyncStore.getState().failedOperations).toHaveLength(0);

        // 4. A stray re-drain of the same op id is idempotent (server already has
        //    it → 409 → 'done'); nothing is re-queued or duplicated.
        const dup = { method: 'POST', endpoint: '/feed-records', payload: { id: 'op-uuid-1' } } as any;
        mockedRequest.mockRejectedValueOnce({ response: { status: 409 } });
        await expect(replayQueuedOp(dup)).resolves.toBe('done');
        expect(useSyncStore.getState().queue).toHaveLength(0);

        expect(mockedPost).not.toHaveBeenCalled(); // everything went through the drain path
    });
});
