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
