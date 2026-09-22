/** F2 display helpers for the photo pool (pure, tested). */
import type { PhotoItem, PhotoLimits } from '../api/photos';

/** "780 MB", "1.5 GB", "320 KB" — 1024-based, same as the backend limit. */
export function formatBytes(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.max(0, Math.round(kb))} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${Math.round(mb)} MB`;
    return `${(mb / 1024).toFixed(1).replace(/\.0$/, '')} GB`;
}

/** Share of the photo limit used — all the app shows (the byte backstop is never shown). */
export function poolFraction(used: { photos: number; bytes: number }, limits: PhotoLimits): number {
    return used.photos / limits.photos;
}

export type PoolLevel = 'ok' | 'warn' | 'critical' | 'full';

/**
 * 80% → warn, 95% → critical (stronger warning), 100% → the picker refuses.
 * Full also when the hidden byte backstop is hit — the server refuses then too.
 */
export function poolLevel(used: { photos: number; bytes: number }, limits: PhotoLimits): PoolLevel {
    if (used.photos >= limits.photos || used.bytes >= limits.bytes) return 'full';
    const f = poolFraction(used, limits);
    return f >= 0.95 ? 'critical' : f >= 0.8 ? 'warn' : 'ok';
}

/** Newest month first; items keep their order inside a month. Key is `YYYY-MM`. */
export function groupByMonth(items: PhotoItem[]): { month: string; items: PhotoItem[] }[] {
    const out: { month: string; items: PhotoItem[] }[] = [];
    for (const it of items) {
        const month = String(it.uploadedAt).slice(0, 7);
        const last = out[out.length - 1];
        if (last?.month === month) last.items.push(it);
        else out.push({ month, items: [it] });
    }
    return out;
}
