/**
 * A SLOW SERVER IS NOT AN EMPTY ONE.
 *
 * The backend sleeps on Render's free plan and takes 30–60 s to wake. Every
 * screen used to sit on its empty/loading state for the full 15 s timeout (and
 * a retry) before the offline cache got a chance. These pin the HTTP-layer
 * contract: after SLOW_REQUEST_MS a GET with a last-known copy answers from it,
 * the "waking up" flag is raised while the request is outstanding, and the late
 * real answer refreshes the cache.
 */
import { queryClient } from '../../query/client';
import { useUIStore } from '../../store/uiStore';
import { readCached, writeCached, clearOfflineCache } from '../offlineCache';

jest.mock('../../store/authStore', () => ({
    useAuthStore: {
        getState: () => ({ accessToken: 'a-token', session: null, refreshToken: null }),
    },
}));

jest.mock('../../i18n', () => ({
    __esModule: true,
    default: { t: (key: string) => key },
}));

import apiClient, { SLOW_REQUEST_MS } from '../client';

/** An adapter that answers `data` only when `release()` is called. */
const respondLater = (data: unknown) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    apiClient.defaults.adapter = (async (config: any) => {
        await gate;
        return { data, status: 200, statusText: 'OK', headers: {}, config };
    }) as any;
    return () => release();
};

beforeEach(async () => {
    await clearOfflineCache();
    useUIStore.setState({ slowRequests: 0 });
    jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as any);
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

it('answers a slow GET from the last-known copy and flags the server as waking', async () => {
    await writeCached('/ponds', [{ id: 'old' }]);
    const release = respondLater([{ id: 'fresh' }]);

    let result: any;
    void apiClient.get('/ponds').then((r) => (result = r));

    await jest.advanceTimersByTimeAsync(SLOW_REQUEST_MS - 100);
    expect(result).toBeUndefined();
    expect(useUIStore.getState().slowRequests).toBe(0);

    await jest.advanceTimersByTimeAsync(200);
    expect(result?.data).toEqual([{ id: 'old' }]);
    expect(useUIStore.getState().slowRequests).toBe(1);

    // The real answer lands later: the flag clears, the cache and the screen
    // on display catch up.
    release();
    await jest.advanceTimersByTimeAsync(600);
    expect(useUIStore.getState().slowRequests).toBe(0);
    expect((await readCached('/ponds'))?.data).toEqual([{ id: 'fresh' }]);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ type: 'active' });
});

it('keeps waiting (flagged) when there is nothing cached, then returns the real answer', async () => {
    const release = respondLater([{ id: 'fresh' }]);

    let result: any;
    void apiClient.get('/farms').then((r) => (result = r));

    await jest.advanceTimersByTimeAsync(SLOW_REQUEST_MS + 100);
    expect(result).toBeUndefined();
    expect(useUIStore.getState().slowRequests).toBe(1);

    release();
    await jest.advanceTimersByTimeAsync(0);
    expect(result?.data).toEqual([{ id: 'fresh' }]);
    expect(useUIStore.getState().slowRequests).toBe(0);
});

it('does not touch a fast request', async () => {
    await writeCached('/ponds', [{ id: 'old' }]);
    const release = respondLater([{ id: 'fresh' }]);
    release();

    const res = await apiClient.get('/ponds');
    expect(res.data).toEqual([{ id: 'fresh' }]);
    expect(useUIStore.getState().slowRequests).toBe(0);
});

it('serves the last-known copy on a gateway 503 (a sleeping server), GET only', async () => {
    await writeCached('/ponds', [{ id: 'old' }]);
    apiClient.defaults.adapter = (async (config: any) => {
        const err = new Error('Request failed with status code 503') as any;
        err.isAxiosError = true;
        err.config = config;
        err.response = { status: 503, data: {}, statusText: '', headers: {}, config };
        throw err;
    }) as any;

    expect((await apiClient.get('/ponds')).data).toEqual([{ id: 'old' }]);
    await expect(apiClient.post('/ponds', {})).rejects.toMatchObject({ response: { status: 503 } });
});

it('retries a timed-out GET once before giving up', async () => {
    let calls = 0;
    apiClient.defaults.adapter = (async (config: any) => {
        calls += 1;
        if (calls === 1) {
            const err = new Error('timeout of 15000ms exceeded') as any;
            err.isAxiosError = true;
            err.code = 'ECONNABORTED';
            err.config = config;
            throw err;
        }
        return { data: 'second', status: 200, statusText: 'OK', headers: {}, config };
    }) as any;

    expect((await apiClient.get('/farms')).data).toBe('second');
    expect(calls).toBe(2);
});
