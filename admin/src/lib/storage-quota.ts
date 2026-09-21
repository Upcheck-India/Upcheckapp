import 'server-only';
import { getAdminKey } from './admin-key';

/**
 * Admin photo-quota management: GET /admin/storage/top, GET/PUT/DELETE
 * /admin/users/:id/storage(/limit). Same fetch/error shape as the other
 * lib/*.ts files (server-only, no-store, backend's own error message passed
 * through) — see lib/directory.ts and lib/ops.ts for the same pattern.
 */

export class ApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'ApiError';
    }
}

function baseUrl() {
    const url = process.env.UPCHECK_API_URL;
    if (!url) {
        throw new Error('UPCHECK_API_URL must be set on this deployment.');
    }
    return url.replace(/\/$/, '');
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const key = await getAdminKey();
    const res = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', 'x-admin-key': key, ...(init?.headers ?? {}) },
        cache: 'no-store',
    });
    if (!res.ok) {
        const detail = await res.text().then(
            (body) => {
                try {
                    return (JSON.parse(body) as { message?: string }).message ?? '';
                } catch {
                    return body.slice(0, 200);
                }
            },
            () => '',
        );
        throw new ApiError(
            `${init?.method ?? 'GET'} ${path} failed: ${res.status}${detail ? ` — ${detail}` : ''}`,
            res.status,
        );
    }
    return res.json() as Promise<T>;
}

export interface PondUsage { pondId: string | null; name: string | null; photos: number; bytes: number }
export interface FarmUsage { farmId: string; name: string | null; photos: number; bytes: number; ponds: PondUsage[] }
export interface QuotaOverride {
    maxPhotos: number;
    maxBytes: number;
    reason: string;
    setBy: string;
    setAt: string;
}
export interface OverrideEvent {
    action: string;
    maxPhotos: number | null;
    maxBytes: number | null;
    reason: string;
    setBy: string;
    createdAt: string;
}
export interface UserStorage {
    photos: number;
    bytes: number;
    limits: { photos: number; bytes: number };
    incomplete: boolean;
    farms: FarmUsage[];
    account: { photos: number; bytes: number };
    override: QuotaOverride | null;
    history: OverrideEvent[];
}
export interface TopStorageUser {
    userId: string;
    email: string;
    photos: number;
    bytes: number;
    limits: { photos: number; bytes: number };
    percentOfLimit: number;
    overridden: boolean;
}

export function getUserStorage(userId: string): Promise<UserStorage> {
    return call<UserStorage>(`/admin/users/${userId}/storage`);
}

export function getTopStorageUsers(): Promise<TopStorageUser[]> {
    return call<TopStorageUser[]>('/admin/storage/top');
}

export function setQuotaLimit(
    userId: string,
    dto: { maxPhotos: number; maxBytes: number; reason: string },
): Promise<QuotaOverride> {
    return call<QuotaOverride>(`/admin/users/${userId}/storage/limit`, {
        method: 'PUT',
        body: JSON.stringify(dto),
    });
}

export function resetQuotaLimit(userId: string, reason: string): Promise<{ reset: boolean }> {
    return call<{ reset: boolean }>(`/admin/users/${userId}/storage/limit`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
    });
}
