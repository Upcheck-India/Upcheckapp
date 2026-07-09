import { create } from 'zustand';
import * as Crypto from 'expo-crypto';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface UploadJob {
    id: string;
    localUri: string;
    remoteUrl?: string;
    entityType: string;
    entityLocalId: string;
    progress: number;
    status: UploadStatus;
    error?: string;
}

interface UploadState {
    jobs: UploadJob[];

    addJob: (job: Omit<UploadJob, 'id' | 'progress' | 'status'>) => string;
    updateProgress: (id: string, progress: number) => void;
    completeJob: (id: string, remoteUrl: string) => void;
    failJob: (id: string, error: string) => void;
    retryJob: (id: string) => void;
    removeJob: (id: string) => void;
    pendingCount: () => number;
    /** Drop all jobs — called on logout so one user's uploads never replay under another's token. */
    reset: () => void;
}

export const useUploadStore = create<UploadState>()((set, get) => ({
    jobs: [],

    addJob: (job) => {
        const id = Crypto.randomUUID();
        set((state) => ({
            jobs: [
                ...state.jobs,
                { ...job, id, progress: 0, status: 'pending' as const },
            ],
        }));
        return id;
    },

    updateProgress: (id, progress) =>
        set((state) => ({
            jobs: state.jobs.map((j) =>
                j.id === id ? { ...j, progress, status: 'uploading' as const } : j
            ),
        })),

    completeJob: (id, remoteUrl) =>
        set((state) => ({
            jobs: state.jobs.map((j) =>
                j.id === id ? { ...j, remoteUrl, progress: 100, status: 'completed' as const } : j
            ),
        })),

    failJob: (id, error) =>
        set((state) => ({
            jobs: state.jobs.map((j) =>
                j.id === id ? { ...j, status: 'failed' as const, error } : j
            ),
        })),

    retryJob: (id) =>
        set((state) => ({
            jobs: state.jobs.map((j) =>
                j.id === id ? { ...j, status: 'pending' as const, progress: 0, error: undefined } : j
            ),
        })),

    removeJob: (id) =>
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),

    pendingCount: () =>
        get().jobs.filter((j) => j.status === 'pending' || j.status === 'uploading').length,

    reset: () => set({ jobs: [] }),
}));
