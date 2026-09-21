/**
 * F4 — "you can save your photos any time" (photos spec 2026-09-20).
 *
 * One photo → the share sheet. A record, a pond-month or a whole cycle → a
 * zip of the full-size photos (the small copy where retention already dropped
 * the full size) plus `photos.csv`, so the photos still mean something outside
 * the app. No new native module: fflate is pure JS, the file goes out through
 * expo-sharing like every export.
 *
 * Memory: a batch can be 200 MB, the JS heap cannot hold that. The zip is
 * STREAMED — each photo is downloaded to a temp file, read, pushed through
 * fflate's streaming `Zip` (stored, not deflated: WebP is already compressed)
 * and every chunk it emits is written straight to the zip file on disk. At
 * any moment only one photo's bytes are in memory.
 */
import { Zip, ZipPassThrough, strToU8 } from 'fflate';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { toCsv } from '../utils/csv';
import { safeFilename } from './export/deliver';
import type { BackupItem } from '../api/photos';

/** Per zip (spec F4): over this, the app offers to split by month. */
export const BACKUP_CAP = { photos: 50, bytes: 200 * 1024 * 1024 };

export interface BackupPart {
    /** `YYYY-MM` (plus `-2`, `-3` if one month is itself over the cap); null = everything in one zip. */
    label: string | null;
    items: BackupItem[];
}

const fits = (items: BackupItem[]) =>
    items.length <= BACKUP_CAP.photos && items.reduce((s, i) => s + i.bytes, 0) <= BACKUP_CAP.bytes;

/** Whether this batch needs splitting — ask the farmer before doing it. */
export const overCap = (items: BackupItem[]) => !fits(items);

/**
 * One part if it fits; otherwise one part per month (oldest first), and a
 * month that is itself over the cap is cut into numbered pieces.
 */
export function planBackup(items: BackupItem[]): BackupPart[] {
    if (fits(items)) return [{ label: null, items }];
    const months = new Map<string, BackupItem[]>();
    for (const it of [...items].sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))) {
        const m = it.uploadedAt.slice(0, 7);
        months.set(m, [...(months.get(m) ?? []), it]);
    }
    const parts: BackupPart[] = [];
    for (const [month, list] of months) {
        let piece: BackupItem[] = [];
        let n = 1;
        const flush = () => {
            if (!piece.length) return;
            parts.push({ label: n === 1 ? month : `${month}-${n}`, items: piece });
            piece = [];
            n++;
        };
        for (const it of list) {
            if (piece.length && !fits([...piece, it])) flush();
            piece.push(it);
        }
        flush();
    }
    return parts;
}

/** `001_2026-09-20_disease.webp` — sorts by date, never collides inside a zip. */
export function entryName(item: BackupItem, index: number): string {
    const ext = item.path.split('.').pop() || 'webp';
    const kind = (item.entity ?? 'photo').replace(/[^a-z0-9_]/gi, '');
    return `${String(index + 1).padStart(3, '0')}_${item.uploadedAt.slice(0, 10)}_${kind}.${ext}`;
}

/** The index that travels with the photos (file name, date, pond, record type, record id). */
export function photosCsv(items: BackupItem[]): string {
    return toCsv(
        items.map((it, i) => [entryName(it, i), it.uploadedAt.slice(0, 10), it.pondName, it.entity, it.recordId]),
        ['file', 'date', 'pond', 'record_type', 'record_id'],
    );
}

/**
 * The zip itself, independent of the device: photo bytes come from `read`,
 * zip bytes go to `write` as they are produced. A photo that fails to
 * download is left out (and counted in `missing`) rather than failing the
 * whole backup; the CSV lists exactly what is in the zip.
 */
export async function zipPhotos(
    items: BackupItem[],
    read: (item: BackupItem) => Promise<Uint8Array>,
    write: (chunk: Uint8Array) => void,
    onProgress?: (done: number, total: number) => void,
): Promise<{ saved: number; missing: number }> {
    let failed: unknown = null;
    const zip = new Zip((err, chunk) => {
        if (err) failed = err;
        else write(chunk);
    });
    const add = (name: string, data: Uint8Array) => {
        const entry = new ZipPassThrough(name);
        zip.add(entry);
        entry.push(data, true);
    };
    const saved: BackupItem[] = [];
    let missing = 0;
    for (let i = 0; i < items.length; i++) {
        try {
            const data = await read(items[i]);
            add(entryName(items[i], saved.length), data);
            saved.push(items[i]);
        } catch {
            missing++;
        }
        onProgress?.(i + 1, items.length);
    }
    add('photos.csv', strToU8(photosCsv(saved)));
    zip.end();
    if (failed) throw failed;
    return { saved: saved.length, missing };
}

/** `Neerani-photos-<farm>-<pond>-<cycle>[-<part>].zip`, through the export namer. */
export const backupFilename = (parts: (string | null | undefined)[], label?: string | null) =>
    safeFilename(['Neerani-photos', ...parts, label], 'zip');

/** Download one photo into the cache and hand back the file (caller deletes it). */
async function download(url: string, name: string): Promise<File> {
    const target = new File(Paths.cache, name);
    if (target.exists) target.delete();
    await File.downloadFileAsync(url, target, { idempotent: true });
    return target;
}

/** F4.1: one photo to the share sheet (Save to Files / Drive / WhatsApp…). */
export async function sharePhoto(url: string): Promise<void> {
    const name = (url.split('?')[0].split('/').pop() || 'photo.webp').replace(/\.thumb\./, '.');
    const file = await download(url, `Neerani-${name}`);
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'image/webp', dialogTitle: name });
    }
}

/**
 * F4.2/F4.3: build one zip on disk (streamed) and open the share sheet.
 * Returns what was saved so the caller can say "2 photos could not be
 * downloaded" instead of pretending.
 */
export async function shareBackupZip(
    items: BackupItem[],
    filename: string,
    onProgress?: (done: number, total: number) => void,
): Promise<{ saved: number; missing: number }> {
    const zipFile = new File(Paths.cache, filename);
    if (zipFile.exists) zipFile.delete();
    zipFile.create();
    const handle = zipFile.open();
    let result: { saved: number; missing: number };
    try {
        result = await zipPhotos(
            items,
            async (it) => {
                if (!it.url) throw new Error('not signed');
                const tmp = await download(it.url, `backup-${it.path.split('/').pop()}`);
                try {
                    return await tmp.bytes();
                } finally {
                    tmp.delete();
                }
            },
            (chunk) => handle.writeBytes(chunk),
            onProgress,
        );
    } finally {
        handle.close();
    }
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(zipFile.uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: filename });
    }
    return result;
}
