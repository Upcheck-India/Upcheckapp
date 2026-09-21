/**
 * The task body is defined at module scope (see backgroundSync.ts), so this
 * suite drives it the same way Android would: import the module once, grab
 * the callback TaskManager.defineTask was called with, then invoke it
 * directly — no real background scheduler involved.
 */
let mockPlatformOS: 'android' | 'ios' = 'android';
jest.mock('react-native', () => ({
    Platform: {
        get OS() {
            return mockPlatformOS;
        },
    },
}));

const mockNetInfoFetch = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
    __esModule: true,
    default: { fetch: (...a: unknown[]) => mockNetInfoFetch(...a) },
}));

let definedTask: (() => Promise<unknown>) | undefined;
jest.mock('expo-task-manager', () => ({
    defineTask: (_name: string, fn: () => Promise<unknown>) => {
        definedTask = fn;
    },
}));

const mockRegisterTaskAsync = jest.fn().mockResolvedValue(undefined);
const mockUnregisterTaskAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-background-task', () => ({
    registerTaskAsync: (...a: unknown[]) => mockRegisterTaskAsync(...a),
    unregisterTaskAsync: (...a: unknown[]) => mockUnregisterTaskAsync(...a),
    BackgroundTaskResult: { Success: 1, Failed: 2 },
}));

const mockRehydrate = jest.fn().mockResolvedValue(undefined);
let mockAuthState = { refreshToken: null as string | null };
jest.mock('../../store/authStore', () => ({
    useAuthStore: {
        persist: { rehydrate: (...a: unknown[]) => mockRehydrate(...a) },
        getState: () => mockAuthState,
    },
}));

const mockSetConnected = jest.fn();
jest.mock('../../store/syncStore', () => ({
    useSyncStore: { getState: () => ({ setConnected: mockSetConnected }) },
}));

const mockDrainRecordQueue = jest.fn().mockResolvedValue(undefined);
jest.mock('../recordSync', () => ({ drainRecordQueue: (...a: unknown[]) => mockDrainRecordQueue(...a) }));

import {
    registerBackgroundSync,
    unregisterBackgroundSync,
    BACKGROUND_SYNC_TASK,
} from '../backgroundSync';
import { BackgroundTaskResult } from 'expo-background-task';

describe('backgroundSync task body', () => {
    beforeEach(() => {
        mockPlatformOS = 'android';
        mockAuthState = { refreshToken: 'rt-1' };
        mockNetInfoFetch.mockResolvedValue({ isConnected: true });
        jest.clearAllMocks();
    });

    it('was defined at module load', () => {
        expect(definedTask).toBeDefined();
        expect(BACKGROUND_SYNC_TASK).toBe('upcheck-background-sync');
    });

    it('no-ops when signed out (no persisted refresh token)', async () => {
        mockAuthState = { refreshToken: null };
        const result = await definedTask!();
        expect(mockDrainRecordQueue).not.toHaveBeenCalled();
        expect(result).toBe(BackgroundTaskResult.Success);
    });

    it('no-ops when offline', async () => {
        mockNetInfoFetch.mockResolvedValue({ isConnected: false });
        const result = await definedTask!();
        expect(mockSetConnected).toHaveBeenCalledWith(false);
        expect(mockDrainRecordQueue).not.toHaveBeenCalled();
        expect(result).toBe(BackgroundTaskResult.Success);
    });

    it('drains the queue when signed in and online', async () => {
        const result = await definedTask!();
        expect(mockSetConnected).toHaveBeenCalledWith(true);
        expect(mockDrainRecordQueue).toHaveBeenCalledTimes(1);
        expect(result).toBe(BackgroundTaskResult.Success);
    });

    it('never throws — a drain failure is swallowed and reported as Failed', async () => {
        mockDrainRecordQueue.mockRejectedValueOnce(new Error('boom'));
        await expect(definedTask!()).resolves.toBe(BackgroundTaskResult.Failed);
    });

    it('is a guarded no-op on iOS (no Info.plist entry to permit it)', async () => {
        mockPlatformOS = 'ios';
        const result = await definedTask!();
        expect(mockDrainRecordQueue).not.toHaveBeenCalled();
        expect(result).toBe(BackgroundTaskResult.Success);
    });

    it('does not double-drain a concurrent foreground call — that guard lives in syncStore.drainQueue', async () => {
        // backgroundSync always calls drainRecordQueue; the concurrency guard
        // (status === 'syncing') is syncStore's, exercised in syncStore's own
        // tests. Here we only confirm the task calls the shared drain path
        // rather than reimplementing one.
        await Promise.all([definedTask!(), definedTask!()]);
        expect(mockDrainRecordQueue).toHaveBeenCalledTimes(2);
    });
});

describe('registerBackgroundSync / unregisterBackgroundSync', () => {
    beforeEach(() => {
        mockPlatformOS = 'android';
        jest.clearAllMocks();
    });

    it('registers with the 15-minute Android minimum on sign-in', async () => {
        await registerBackgroundSync();
        expect(mockRegisterTaskAsync).toHaveBeenCalledWith(
            BACKGROUND_SYNC_TASK,
            expect.objectContaining({ minimumInterval: 15 }),
        );
    });

    it('unregisters on sign-out', async () => {
        await unregisterBackgroundSync();
        expect(mockUnregisterTaskAsync).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK);
    });

    it('does nothing on iOS', async () => {
        mockPlatformOS = 'ios';
        await registerBackgroundSync();
        await unregisterBackgroundSync();
        expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
        expect(mockUnregisterTaskAsync).not.toHaveBeenCalled();
    });

    it('registerBackgroundSync swallows a registration error', async () => {
        mockRegisterTaskAsync.mockRejectedValueOnce(new Error('not available'));
        await expect(registerBackgroundSync()).resolves.toBeUndefined();
    });
});
