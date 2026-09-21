import 'server-only';
import { getAdminKey } from './admin-key';

/**
 * GET /admin/overview — one call for the dashboard home page. Same
 * fetch/error shape as `@/lib/feedback` (server-only, no-store, the backend's
 * own error message passed through) but kept separate rather than sharing a
 * helper: this app has no shared HTTP client, and one is not worth inventing
 * for two files that already agree by copying each other.
 */

export interface AdminOverview {
    signups: { today: number; last7d: number; last30d: number; total: number } | null;
    farms: { total: number; active: number } | null;
    ponds: { total: number; active: number } | null;
    cycles: { active: number } | null;
    logsPerDay: { date: string; count: number }[];
    feedback: { open: number } | null;
    photoDeletions: { failed: number; pending: number } | null;
    storage: { objectCount: number; totalBytes: number } | null;
}

export class ApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function getOverview(): Promise<AdminOverview> {
    const baseUrl = process.env.UPCHECK_API_URL;
    const key = getAdminKey();
    if (!baseUrl || !key) {
        throw new Error('UPCHECK_API_URL and ADMIN_API_KEY must both be set on this deployment.');
    }
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/overview`, {
        headers: { 'x-admin-key': key },
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
        throw new ApiError(`GET /admin/overview failed: ${res.status}${detail ? ` — ${detail}` : ''}`, res.status);
    }
    return res.json() as Promise<AdminOverview>;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value.toFixed(1)} ${units[i]}`;
}
