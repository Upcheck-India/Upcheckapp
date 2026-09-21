import apiClient from './client';

/**
 * F2: the account's photo pool (Settings → Photos & storage). Mirrors
 * backend/src/storage/photos.controller.ts. Online only — nothing here is
 * loggable data, so there is no offline queue.
 */
export interface PhotoLimits {
    photos: number;
    bytes: number;
}

export interface PondUsage {
    pondId: string | null;
    name: string | null;
    photos: number;
    bytes: number;
}

export interface FarmUsage {
    farmId: string;
    name: string | null;
    photos: number;
    bytes: number;
    ponds: PondUsage[];
}

export interface PhotoUsage {
    photos: number;
    bytes: number;
    limits: PhotoLimits;
    /** True until the one-off backfill has put pre-F2 photos in the ledger. */
    incomplete: boolean;
    farms: FarmUsage[];
    /** Profile picture + feedback screenshots. */
    account: { photos: number; bytes: number };
}

export interface PhotoItem {
    path: string;
    /** 'health_observation' | 'mortality' | 'disease' | null (not on a record). */
    entity: string | null;
    recordId: string | null;
    uploadedAt: string;
    bytes: number;
    protected: boolean;
    url: string | null;
    thumbUrl: string | null;
}

export interface FreeUpOption {
    kind: 'crop' | 'pond';
    id: string;
    name: string | null;
    pondName: string | null;
    farmName: string | null;
    /** What clearing it frees — protected photos are never included. */
    photos: number;
    bytes: number;
    /** Protected photos that stay. */
    protected: number;
}

export const photosApi = {
    usage: () => apiClient.get<PhotoUsage>('/photos/usage'),
    /** The pool a pond's uploads count against (its farm owner's). */
    quotaForPond: (pondId: string) =>
        apiClient.get<{ photos: number; bytes: number; limits: PhotoLimits }>(`/photos/quota/pond/${pondId}`),
    items: (scope: { pondId: string } | { farmId: string }) =>
        apiClient.get<PhotoItem[]>('/photos/items', { params: scope }),
    freeUpOptions: () => apiClient.get<FreeUpOption[]>('/photos/free-up'),
    freeUp: (kind: 'crop' | 'pond', id: string) =>
        apiClient.post<{ photos: number; bytes: number }>('/photos/free-up', { kind, id }),
    removeItem: (path: string) =>
        apiClient.delete<{ removed: boolean; protected: boolean }>('/photos/item', { data: { path } }),
};
