import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dependency-free id for queued operations (no crypto polyfill needed — these
// ids are local queue keys, not security-sensitive).
const uuidv4 = (): string =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type SyncStatus = 'online' | 'offline' | 'syncing';

export type QueuedOperation = {
    id: string;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    payload: Record<string, unknown>;
    localId?: string;
    retryCount: number;
    createdAt: string;
};

/** Handler signature for drainQueue — receives each op, returns true on success. */
export type DrainHandler = (op: QueuedOperation) => Promise<boolean>;

interface SyncState {
    status: SyncStatus;
    /** True when the device has an active internet connection. */
    isConnected: boolean;
    queue: QueuedOperation[];
    lastSyncedAt: string | null;
    failedOperations: QueuedOperation[];

    /** Update connectivity flag and derive status (offline / online). */
    setConnected: (connected: boolean) => void;
    setStatus: (status: SyncStatus) => void;
    enqueue: (operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'createdAt'>) => void;
    dequeue: (id: string) => void;
    markFailed: (id: string) => void;
    retryFailed: () => void;
    clearQueue: () => void;
    setLastSyncedAt: (time: string) => void;
    /**
     * Process every queued operation through `handler` in order.
     * Successfully handled ops are removed; failed ops are moved to failedOperations.
     * No-ops when offline or already syncing.
     */
    drainQueue: (handler: DrainHandler) => Promise<void>;
}

export const useSyncStore = create<SyncState>()(
    persist(
        (set, get) => ({
            status: 'online',
            isConnected: true,
            queue: [],
            lastSyncedAt: null,
            failedOperations: [],

            setConnected: (connected) =>
                set((state) => ({
                    isConnected: connected,
                    // Only switch between online/offline; preserve 'syncing' if in-flight.
                    status: state.status === 'syncing'
                        ? state.status
                        : connected ? 'online' : 'offline',
                })),

            setStatus: (status) => set({ status }),

            enqueue: (operation) => {
                const newOp: QueuedOperation = {
                    ...operation,
                    id: uuidv4(),
                    retryCount: 0,
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({ queue: [...state.queue, newOp] }));
            },

            dequeue: (id) =>
                set((state) => ({ queue: state.queue.filter((op) => op.id !== id) })),

            markFailed: (id) => {
                const op = get().queue.find((o) => o.id === id);
                if (!op) return;
                set((state) => ({
                    queue: state.queue.filter((o) => o.id !== id),
                    failedOperations: [...state.failedOperations, { ...op, retryCount: op.retryCount + 1 }],
                }));
            },

            retryFailed: () =>
                set((state) => ({
                    queue: [...state.queue, ...state.failedOperations],
                    failedOperations: [],
                })),

            clearQueue: () => set({ queue: [], failedOperations: [] }),

            setLastSyncedAt: (time) => set({ lastSyncedAt: time }),

            drainQueue: async (handler) => {
                const state = get();
                if (!state.isConnected || state.status === 'syncing') return;
                if (state.queue.length === 0) return;

                set({ status: 'syncing' });
                // Snapshot the queue so concurrent enqueues during drain are safe.
                const opsToProcess = [...get().queue];

                for (const op of opsToProcess) {
                    try {
                        const ok = await handler(op);
                        if (ok) {
                            get().dequeue(op.id);
                        } else {
                            get().markFailed(op.id);
                        }
                    } catch {
                        get().markFailed(op.id);
                    }
                }

                const nowConnected = get().isConnected;
                set({
                    status: nowConnected ? 'online' : 'offline',
                    lastSyncedAt: new Date().toISOString(),
                });
            },
        }),
        {
            name: 'sync-queue-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // isConnected is runtime state — don't rehydrate a stale value;
            // it will be set correctly once NetInfo fires on mount.
            partialize: (state) => ({
                queue: state.queue,
                failedOperations: state.failedOperations,
                lastSyncedAt: state.lastSyncedAt,
            }),
        }
    )
);
