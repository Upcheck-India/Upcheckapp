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
    /** Farm photos not tied to a farm (normally none — avatars and feedback screenshots do not count). */
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

/** F4: one photo in a backup batch — a download URL plus its photos.csv row. */
export interface BackupItem {
    path: string;
    /** Signed; the small copy's URL once retention dropped the full size. */
    url: string | null;
    entity: string | null;
    recordId: string | null;
    uploadedAt: string;
    fullDroppedAt: string | null;
    /** What the download weighs (full size, or the small copy). */
    bytes: number;
    farmName: string | null;
    pondName: string | null;
    cropName: string | null;
}

export interface BackupCycle {
    cropId: string;
    name: string | null;
    pondName: string | null;
    farmName: string | null;
    photos: number;
    bytes: number;
}

/** F3/F4/F7.8: what the viewer needs to know about a farm photo. */
export interface PhotoInfo {
    path: string;
    entity: string | null;
    recordId: string | null;
    uploadedAt: string;
    uploadedByMe: boolean;
    /** Set once retention kept only the small copy. */
    fullDroppedAt: string | null;
}

/** F3: the retention line and the one in-app notice. */
export interface PhotoRetention {
    /** Oldest farm photo still at full size (null = none). */
    oldestFullAt: string | null;
    /** The next batch that shrinks to small copies, and when. */
    upcoming: { photos: number; since: string; date: string } | null;
}

export type BackupScope = { recordId: string } | { pondId: string; month: string } | { cropId: string };

export interface FreeUpOption {
    /** 'old' = photos older than 12 months (their small copies). */
    kind: 'old' | 'crop' | 'pond';
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

/** Photos per record — mirrors `cap` in backend/src/storage/photo-surfaces.ts. */
export const PHOTO_CAPS: Record<PhotoSurfaceKey, number> = {
    expense_receipt: 3,
    transaction_receipt: 3,
    harvest_slip: 3,
    treatment_label: 3,
    feed_label: 3,
    inventory_label: 3,
    inventory_purchase_receipt: 3,
    seed_pcr: 3,
    // Identity photos: one, replaced (the API takes a single path).
    pond_identity: 1,
    farm_identity: 1,
    water_colour: 2,
    feed_tray: 2,
};

/** F6: one row on the pond Photos tab. */
export interface PondPhoto {
    path: string;
    entity: string | null;
    title: string;
    recordId: string | null;
    /** For the tap-to-open mapping (F6) — most record screens key on these, not the pond. */
    cropId: string | null;
    farmId: string | null;
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
    freeUp: (kind: FreeUpOption['kind'], id: string) =>
        apiClient.post<{ photos: number; bytes: number }>('/photos/free-up', kind === 'old' ? { kind } : { kind, id }),
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

    /**
     * F5: delete a not-yet-saved upload the picker already sent — before the
     * form it belongs to is submitted. A path already on a saved record is
     * removed by that record's own save with the path dropped, never here.
     */
    removeForPond: (pondId: string, path: string) => apiClient.delete(`/photos/upload/pond/${pondId}`, { data: { path } }),
    removeForFarm: (farmId: string, path: string) => apiClient.delete(`/photos/upload/farm/${farmId}`, { data: { path } }),

    /** F8.1: has this account acknowledged "Farm records only" yet? */
    getTermsAck: () => apiClient.get<{ ackedAt: string | null }>('/photos/terms-ack'),

    /** F8.1: acknowledge once; idempotent, safe to retry after coming back online. */
    postTermsAck: () => apiClient.post<{ ackedAt: string | null }>('/photos/terms-ack'),
    backup: (scope: BackupScope) => apiClient.get<BackupItem[]>('/photos/backup', { params: scope }),
    backupCycles: () => apiClient.get<BackupCycle[]>('/photos/backup/cycles'),
    info: (paths: string[]) => apiClient.get<PhotoInfo[]>('/photos/info', { params: { paths: paths.join(',') } }),
    retention: () => apiClient.get<PhotoRetention>('/photos/retention'),
};

/**
 * The farm-photo path inside a signed R2 URL — `…/health/<farm>/<uuid>.webp?…`
 * (or its `.thumb.webp`) → `<farm>/<uuid>.webp`. Null for anything that is
 * not a farm photo (avatars, report screenshots).
 */
export const farmPhotoPath = (url: string): string | null => {
    const m = /\/health\/([0-9a-f-]{36}\/[0-9a-f-]{36})(?:\.thumb)?\.(webp|jpg|png|heic)(?:[?#]|$)/.exec(url);
    return m ? `${m[1]}.${m[2]}` : null;
};
