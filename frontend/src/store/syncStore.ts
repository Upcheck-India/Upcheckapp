import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

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

interface SyncState {
    status: SyncStatus;
    queue: QueuedOperation[];
    lastSyncedAt: string | null;
    failedOperations: QueuedOperation[];

    setStatus: (status: SyncStatus) => void;
    enqueue: (operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'createdAt'>) => void;
    dequeue: (id: string) => void;
    markFailed: (id: string) => void;
    retryFailed: () => void;
    clearQueue: () => void;
    setLastSyncedAt: (time: string) => void;
}

export const useSyncStore = create<SyncState>()(
    persist(
        (set, get) => ({
            status: 'online',
            queue: [],
            lastSyncedAt: null,
            failedOperations: [],

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
        }),
        {
            name: 'sync-queue-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
