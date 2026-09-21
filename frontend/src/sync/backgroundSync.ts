import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';
import { drainRecordQueue } from './recordSync';

/**
 * Drains the offline record queue while the app is closed/backgrounded.
 *
 * Android only. expo-background-task's config plugin only touches iOS's
 * Info.plist (UIBackgroundModes / BGTaskSchedulerPermittedIdentifiers) — see
 * node_modules/expo-background-task/plugin — and this app cannot apply that
 * plugin without a native build (see AGENTS.md: no native config change).
 * Calling BackgroundTask.registerTaskAsync on iOS with no permitted
 * identifier risks a native exception, so iOS is a deliberate, guarded no-op
 * until a build carries that Info.plist entry.
 */
export const BACKGROUND_SYNC_TASK = 'upcheck-background-sync';

// The task body is defined at module scope (never inside a component) so it
// exists the moment this module is imported — including on a headless start
// where Android wakes the JS engine just to run the registered task, with no
// screen ever mounted.
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
        if (Platform.OS !== 'android') return BackgroundTask.BackgroundTaskResult.Success;

        // A headless start makes a store from scratch; the persist middleware
        // rehydrates async, and nothing has awaited that yet. Force it so the
        // signed-out check below reads the real, persisted value rather than
        // the store's cold-start default.
        await useAuthStore.persist.rehydrate();
        // refreshToken (not isAuthenticated, which is NOT persisted — see
        // authStore's partialize) is the durable "is anyone signed in" signal
        // available before any network call. Matches authStore.initialize().
        if (!useAuthStore.getState().refreshToken) {
            return BackgroundTask.BackgroundTaskResult.Success; // signed out — nothing to drain
        }

        // syncStore's isConnected defaults to true and is never persisted, so
        // in a fresh headless context it does not reflect reality. Ask NetInfo
        // directly, same as OfflineIndicator does on the foreground path.
        const net = await NetInfo.fetch();
        const isConnected = net.isConnected ?? false;
        useSyncStore.getState().setConnected(isConnected);
        if (!isConnected) return BackgroundTask.BackgroundTaskResult.Success; // offline — nothing to drain

        // drainRecordQueue -> syncStore.drainQueue already guards against a
        // concurrent foreground drain (bails out when status === 'syncing'),
        // so this task can run alongside OfflineIndicator/SyncStatusScreen's
        // own drain calls without double-sending anything.
        await drainRecordQueue();
        return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
        // Never let the task throw — an uncaught error here is worse than a
        // skipped drain; the next scheduled run tries again.
        return BackgroundTask.BackgroundTaskResult.Failed;
    }
});

/** Register the periodic drain. Call once, after sign-in. Android only. */
export async function registerBackgroundSync(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: 15, // minutes — the Android platform minimum
        });
    } catch {
        // Best-effort: a device that refuses background scheduling still
        // gets the foreground drain paths (reconnect, app open, pull-to-sync).
    }
}

/** Unregister the periodic drain. Call on sign-out. Android only. */
export async function unregisterBackgroundSync(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    } catch {
        // Best-effort — nothing to clean up if it was never registered.
    }
}
