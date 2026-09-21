import 'server-only';
import { getAdminKey } from './admin-key';

/**
 * Screens for existing staff-only admin endpoints: news ingest, price feeds,
 * the photo-deletion queue. One small file rather than three near-identical
 * ones — each export below is a single call, not a resource with its own CRUD.
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

// ── news ──
export interface NewsIngestResult {
    sources: { source: string; fetched: number; inserted: number; skipped: number; error?: string }[];
}
export function ingestNews(): Promise<NewsIngestResult> {
    return call<NewsIngestResult>('/admin/news/ingest', { method: 'POST' });
}

// ── price feeds ──
export interface PriceFeed {
    id: string;
    region: string;
    date: string;
    prices: Record<string, number>;
    source: string;
    createdAt: string;
}
export function listPriceFeeds(region: string): Promise<PriceFeed[]> {
    if (!region.trim()) return Promise.resolve([]);
    return call<PriceFeed[]>(`/india/price-feeds?region=${encodeURIComponent(region.trim())}`);
}
export function createPriceFeed(dto: {
    region: string;
    date: string;
    prices: Record<string, number>;
    source?: string;
}): Promise<PriceFeed> {
    return call<PriceFeed>('/india/price-feeds', { method: 'POST', body: JSON.stringify(dto) });
}

// ── photo deletion queue ──
export interface DrainResult {
    deleted: number;
    failed: number;
}
export interface FailedDeletion {
    id: string;
    namespace: string;
    path: string;
    reason: string;
    attempts: number;
    last_error: string | null;
    requested_at: string;
}
export function drainPhotoDeletions(): Promise<DrainResult> {
    return call<DrainResult>('/admin/photos/drain', { method: 'POST' });
}
export function listFailedDeletions(): Promise<FailedDeletion[]> {
    return call<FailedDeletion[]>('/admin/photos/deletions/failed');
}
