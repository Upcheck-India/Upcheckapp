jest.mock('expo-crypto', () => ({ randomUUID: () => 'fixed-uuid' }));
jest.mock('../../api/client', () => ({
    __esModule: true,
    default: { post: jest.fn(), request: jest.fn() },
}));

import apiClient from '../../api/client';
import { useSyncStore } from '../../store/syncStore';
import { saveRecord, replayQueuedOp } from '../recordSync';

const mockedPost = apiClient.post as jest.Mock;
const mockedRequest = (apiClient as any).request as jest.Mock;

describe('recordSync.saveRecord', () => {
    beforeEach(() => {
        useSyncStore.getState().clearQueue();
        useSyncStore.getState().setConnected(true);
        jest.clearAllMocks();
    });

    it('POSTs immediately when online and stamps a client id', async () => {
        mockedPost.mockResolvedValue({ data: { id: 'fixed-uuid' } });

        const r = await saveRecord({ entity: 'feed', endpoint: '/feed-records', payload: { pondId: 'p1', quantityKg: 5 } });

        expect(r.queued).toBe(false);
        expect(r.id).toBe('fixed-uuid');
        expect(mockedPost).toHaveBeenCalledWith('/feed-records', { pondId: 'p1', quantityKg: 5, id: 'fixed-uuid' });
        expect(useSyncStore.getState().queue).toHaveLength(0);
    });

    it('queues immediately when offline (optimistic save)', async () => {
        useSyncStore.getState().setConnected(false);

        const r = await saveRecord({ entity: 'water_quality', endpoint: '/water-quality', payload: { pondId: 'p1', ph: 7.8 } });

        expect(r.queued).toBe(true);
        expect(mockedPost).not.toHaveBeenCalled();
        expect(useSyncStore.getState().queue).toHaveLength(1);
        expect(useSyncStore.getState().queue[0].payload).toMatchObject({ id: 'fixed-uuid', ph: 7.8 });
    });

    it('queues on a network error (no response)', async () => {
        mockedPost.mockRejectedValue({ message: 'Network Error' }); // axios: no `response`

        const r = await saveRecord({ entity: 'sampling', endpoint: '/sampling', payload: { pondId: 'p1', mbwG: 12 } });

        expect(r.queued).toBe(true);
        expect(useSyncStore.getState().queue).toHaveLength(1);
    });

    it('throws (does not queue) on a server rejection', async () => {
        mockedPost.mockRejectedValue({ response: { status: 400, data: {} } });

        await expect(
            saveRecord({ entity: 'feed', endpoint: '/feed-records', payload: { pondId: 'p1' } }),
        ).rejects.toBeDefined();
        expect(useSyncStore.getState().queue).toHaveLength(0);
    });
});

describe('recordSync.replayQueuedOp', () => {
    const op = { method: 'POST', endpoint: '/feed-records', payload: { id: 'x' } } as any;

    beforeEach(() => jest.clearAllMocks());

    it('returns true (done) on success', async () => {
        mockedRequest.mockResolvedValue({ data: {} });
        await expect(replayQueuedOp(op)).resolves.toBe(true);
    });

    it('returns true (drop) on a 4xx permanent rejection', async () => {
        mockedRequest.mockRejectedValue({ response: { status: 403 } });
        await expect(replayQueuedOp(op)).resolves.toBe(true);
    });

    it('returns false (keep) on a network/5xx error', async () => {
        mockedRequest.mockRejectedValue({ message: 'Network Error' });
        await expect(replayQueuedOp(op)).resolves.toBe(false);
    });
});
