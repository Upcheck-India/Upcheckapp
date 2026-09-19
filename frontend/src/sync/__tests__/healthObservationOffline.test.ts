// D6 — a health check is offline-first: one queue entry for the whole check,
// every sign with its own client-minted id, replayed exactly once, and the
// replay carries the SAME ids (so the server's insert-or-ignore makes it a no-op).
let mockN = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockN}` }));
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
import { healthObservationsApi } from '../../api/healthObservations';
import { resolveEntityForUrl } from '../../query/client';

const mockedPost = (apiClient as any).post as jest.Mock;
const mockedRequest = (apiClient as any).request as jest.Mock;

describe('health observations offline (D6)', () => {
    beforeEach(() => {
        mockN = 0;
        useSyncStore.getState().clearQueue();
        useSyncStore.getState().setConnected(true);
        jest.clearAllMocks();
    });

    it('queues one entry offline and replays it once, with the same per-sign ids', async () => {
        useSyncStore.getState().setConnected(false);
        const r = await healthObservationsApi.save({
            pondId: 'p1',
            observedOn: '2026-09-19',
            source: 'quick',
            signs: [
                { sign: 'white_feces', level: 'many' },
                { sign: 'soft_shell', level: 'none' },
            ],
        });
        expect(r.queued).toBe(true);
        expect(mockedPost).not.toHaveBeenCalled();
        expect(useSyncStore.getState().queue).toHaveLength(1);

        useSyncStore.getState().setConnected(true);
        mockedRequest.mockResolvedValue({ data: [] });
        await drainRecordQueue();
        await drainRecordQueue(); // a second drain must not resend
        expect(mockedRequest).toHaveBeenCalledTimes(1);
        const sent = mockedRequest.mock.calls[0][0];
        expect(sent).toMatchObject({ method: 'POST', url: '/health-observations' });
        expect(sent.data.signs).toEqual([
            { id: 'uuid-1', sign: 'white_feces', level: 'many' },
            { id: 'uuid-2', sign: 'soft_shell', level: 'none' },
        ]);
        expect(useSyncStore.getState().queue).toHaveLength(0);
    });

    it('a write to /health-observations refreshes the pond (molt checklist) and brief', () => {
        expect(resolveEntityForUrl('/health-observations')).toBe('health_observation');
    });
});
