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

/** Mirrors backend/src/storage/photo-surfaces.ts (SurfaceKey). */
export type PhotoSurfaceKey =
    | 'expense_receipt'
    | 'transaction_receipt'
    | 'harvest_slip'
    | 'treatment_label'
    | 'feed_label'
    | 'inventory_label'
    | 'inventory_purchase_receipt'
    | 'seed_pcr'
    | 'pond_identity'
    | 'farm_identity'
    | 'water_colour'
    | 'feed_tray';

/** F6: one row on the pond Photos tab. */
export interface PondPhoto {
    path: string;
    entity: string | null;
    title: string;
    recordId: string | null;
    uploadedAt: string;
    protected: boolean;
    money: boolean;
    url: string | null;
    thumbUrl: string | null;
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

    // ── F5/F6/F8.1 (photos spec 2026-09-20) ──────────────────────────────

    /** One compressed photo, scoped to a pond, → its private storage path. */
    uploadForPond: (pondId: string, surface: PhotoSurfaceKey, uri: string) => {
        const form = new FormData();
        form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
        return apiClient.post<{ path: string }>(`/photos/upload/pond/${pondId}`, form, {
            params: { surface },
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
    },

    /** Same, scoped to a farm (farm identity photo, inventory item, transaction). */
    uploadForFarm: (farmId: string, surface: PhotoSurfaceKey, uri: string) => {
        const form = new FormData();
        form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
        return apiClient.post<{ path: string }>(`/photos/upload/farm/${farmId}`, form, {
            params: { surface },
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
    },

    /** F6: the pond Photos tab — a view over records, never an album. */
    feedForPond: (pondId: string, opts?: { category?: string; before?: string; limit?: number }) =>
        apiClient.get<PondPhoto[]>(`/photos/pond/${pondId}`, { params: opts }),

    /** F8.1: has this account acknowledged "Farm records only" yet? */
    getTermsAck: () => apiClient.get<{ ackedAt: string | null }>('/photos/terms-ack'),

    /** F8.1: acknowledge once; idempotent, safe to retry after coming back online. */
    postTermsAck: () => apiClient.post<{ ackedAt: string | null }>('/photos/terms-ack'),
};
