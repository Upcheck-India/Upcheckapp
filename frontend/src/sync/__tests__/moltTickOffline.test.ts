// M1.5 — a molt checklist tick is offline-first: queued with a client id,
// replayed once on reconnect, and a replay after the window closed (409) is
// treated as done rather than parked as a failure.
jest.mock('expo-crypto', () => ({ randomUUID: () => 'tick-uuid-1' }));
jest.mock('../../api/client', () => ({
    __esModule: true,
    default: { post: jest.fn(), request: jest.fn(), get: jest.fn() },
}));
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('../../native/TruecallerAuth', () => ({ TruecallerAuth: { clear: jest.fn() } }));
jest.mock('../../api/auth', () => ({ authApi: { refresh: jest.fn(), signout: jest.fn() } }));
jest.mock('../../api/profiles', () => ({ profilesApi: {} }));

import apiClient from '../../api/client';
import { useSyncStore } from '../../store/syncStore';
import { drainRecordQueue } from '../recordSync';
import { moltApi } from '../../api/molt';

const mockedPost = (apiClient as any).post as jest.Mock;
const mockedRequest = (apiClient as any).request as jest.Mock;
const BODY = { windowKey: '2026-09-26-full', actionKey: 'aerator_service', done: true };

describe('molt tick offline (M1.5)', () => {
    beforeEach(() => {
        useSyncStore.getState().clearQueue();
        useSyncStore.getState().setConnected(true);
        jest.clearAllMocks();
    });

    it('queues offline with a client id and replays exactly once on reconnect', async () => {
        useSyncStore.getState().setConnected(false);
        const r = await moltApi.setAction('p1', BODY);
        expect(r).toMatchObject({ queued: true, id: 'tick-uuid-1' });
        expect(mockedPost).not.toHaveBeenCalled();

        useSyncStore.getState().setConnected(true);
        mockedRequest.mockResolvedValue({ data: {} });
        await drainRecordQueue();
        await drainRecordQueue(); // a second drain must not resend
        expect(mockedRequest).toHaveBeenCalledTimes(1);
        expect(mockedRequest).toHaveBeenCalledWith({
            method: 'POST',
            url: '/molt/ponds/p1/actions',
            data: { ...BODY, id: 'tick-uuid-1' },
        });
        expect(useSyncStore.getState().queue).toHaveLength(0);
    });

    it('a replay after the window closed (409) counts as done, not a parked failure', async () => {
        useSyncStore.getState().setConnected(false);
        await moltApi.setAction('p1', BODY);
        useSyncStore.getState().setConnected(true);
        mockedRequest.mockRejectedValueOnce({ response: { status: 409 } });
        await drainRecordQueue();
        expect(useSyncStore.getState().queue).toHaveLength(0);
        expect(useSyncStore.getState().failedOperations).toHaveLength(0);
    });

    it('online: sent now, returns the fresh checklist', async () => {
        mockedPost.mockResolvedValueOnce({ data: { pondId: 'p1', items: [] } });
        const r = await moltApi.setAction('p1', BODY);
        expect(r).toMatchObject({ queued: false, data: { pondId: 'p1' } });
        expect(mockedPost).toHaveBeenCalledWith('/molt/ponds/p1/actions', { ...BODY, id: 'tick-uuid-1' });
    });
});
