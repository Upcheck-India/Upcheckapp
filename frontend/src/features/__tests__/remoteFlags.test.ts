/**
 * Remote flags. The rule under test above all: a flag the server did not send
 * is ON — offline, unconfigured, signed out, not-yet-created all show the
 * feature. Only a present `false` hides anything.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

const mockGet = jest.fn();
jest.mock('../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a) } }));

const mockCaptured = jest.fn();
jest.mock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { extra: { posthogApiKey: 'phc_test_key' } } },
}));
jest.mock('posthog-react-native', () => ({
    __esModule: true,
    default: class {
        capture = mockCaptured;
        optOut = jest.fn();
        reset = jest.fn();
        shutdown = jest.fn();
    },
}));

import {
    clearRemoteFlags,
    fetchRemoteFlags,
    isRemoteFlagOn,
    resetExposuresForTests,
    restoreRemoteFlags,
    useFlag,
    useFlagPayload,
    useRemoteFlagsStore,
    REMOTE_FLAGS,
} from '../remoteFlags';
import { isFeatureEnabled } from '../../config/features';
import { stopAnalytics, syncAnalyticsConsent } from '../analytics';
import { saveTelemetryPrefs } from '../telemetryPrefs';

const U = 'user-1';

beforeEach(async () => {
    clearRemoteFlags();
    resetExposuresForTests();
    await stopAnalytics();
    await AsyncStorage.clear();
    jest.clearAllMocks();
});

describe('defaults', () => {
    it('every flag is on with nothing loaded (signed out / never fetched)', () => {
        for (const k of Object.keys(REMOTE_FLAGS) as (keyof typeof REMOTE_FLAGS)[]) {
            expect(isRemoteFlagOn(k)).toBe(true);
        }
    });

    it('includes the tasks flag', () => {
        expect(REMOTE_FLAGS.tasks).toBe('app-tasks');
    });

    it('absent from the response → on; present false → off; variant string → on', async () => {
        mockGet.mockResolvedValue({ data: { flags: { 'app-news': false, 'app-shop': 'test' }, payloads: {} } });
        await fetchRemoteFlags(U, true);
        expect(isRemoteFlagOn('news')).toBe(false);
        expect(isRemoteFlagOn('shop')).toBe(true);
        expect(isRemoteFlagOn('lunar')).toBe(true);
    });

    it('offline / server error keeps defaults and never throws', async () => {
        mockGet.mockRejectedValue(new Error('Network Error'));
        await expect(fetchRemoteFlags(U, true)).resolves.toBeUndefined();
        expect(isRemoteFlagOn('news')).toBe(true);
    });

    it('signing out drops loaded flags back to defaults', async () => {
        mockGet.mockResolvedValue({ data: { flags: { 'app-news': false }, payloads: {} } });
        await fetchRemoteFlags(U, true);
        clearRemoteFlags();
        expect(isRemoteFlagOn('news')).toBe(true);
    });

    it('config/features.ts honours the remote kill switch for cycle analysis', async () => {
        expect(isFeatureEnabled('cycleAnalysisReport')).toBe(true);
        mockGet.mockResolvedValue({ data: { flags: { 'app-cycle-analysis': false }, payloads: {} } });
        await fetchRemoteFlags(U, true);
        expect(isFeatureEnabled('cycleAnalysisReport')).toBe(false);
        expect(isFeatureEnabled('diseaseDiagnosis')).toBe(true);
    });
});

describe('fetch + cache', () => {
    it('throttles foreground fetches to one per 5 minutes', async () => {
        mockGet.mockResolvedValue({ data: { flags: {}, payloads: {} } });
        await fetchRemoteFlags(U, true);
        await fetchRemoteFlags(U);
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith('/features');
    });

    it('restores the cached response for the same user only', async () => {
        mockGet.mockResolvedValue({ data: { flags: { 'app-export': false }, payloads: { 'app-export': { v: 1 } } } });
        await fetchRemoteFlags(U, true);
        clearRemoteFlags();

        await restoreRemoteFlags('someone-else');
        expect(isRemoteFlagOn('export')).toBe(true);

        await restoreRemoteFlags(U);
        expect(isRemoteFlagOn('export')).toBe(false);
        const { result } = renderHook(() => useFlagPayload<{ v: number }>('export'));
        expect(result.current).toEqual({ v: 1 });
    });

    it('a response landing after sign-out is discarded', async () => {
        let resolve: (v: unknown) => void = () => undefined;
        mockGet.mockReturnValue(new Promise((r) => (resolve = r)));
        const pending = fetchRemoteFlags(U, true);
        clearRemoteFlags();
        resolve({ data: { flags: { 'app-news': false }, payloads: {} } });
        await pending;
        expect(isRemoteFlagOn('news')).toBe(true);
    });
});

describe('useFlag exposure', () => {
    const exposures = () => mockCaptured.mock.calls.filter((c) => c[0] === '$feature_flag_called');

    it('reports nothing while analytics is not running', () => {
        renderHook(() => useFlag('news'));
        expect(mockCaptured).not.toHaveBeenCalled();
    });

    it('reports once per session per flag when analytics is running', async () => {
        await saveTelemetryPrefs({ analytics: 'granted', crashReports: true });
        await syncAnalyticsConsent();
        act(() => useRemoteFlagsStore.getState().set({ flags: { 'app-news': false }, payloads: {} }));

        const a = renderHook(() => useFlag('news'));
        renderHook(() => useFlag('news'));
        expect(a.result.current).toBe(false);
        expect(exposures()).toEqual([
            ['$feature_flag_called', { $feature_flag: 'app-news', $feature_flag_response: false }],
        ]);

        renderHook(() => useFlag('shop'));
        expect(exposures()).toHaveLength(2);
    });
});
