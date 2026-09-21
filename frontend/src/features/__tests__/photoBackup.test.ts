import { strFromU8, unzipSync } from 'fflate';
import { BACKUP_CAP, backupFilename, overCap, planBackup, zipPhotos } from '../photoBackup';
import { farmPhotoPath, type BackupItem } from '../../api/photos';

jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));
jest.mock('expo-sharing', () => ({}));

const FARM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let n = 0;
const item = (uploadedAt: string, over: Partial<BackupItem> = {}): BackupItem => {
    n++;
    return {
        path: `${FARM}/${String(n).padStart(8, '0')}-cccc-4ccc-8ccc-cccccccccccc.webp`,
        url: `https://r2/health/${n}.webp?sig`,
        entity: 'disease',
        recordId: `rec-${n}`,
        uploadedAt,
        fullDroppedAt: null,
        bytes: 1000,
        farmName: 'Green Acres',
        pondName: 'Pond 3',
        cropName: 'Cycle 1',
        ...over,
    };
};

/** Collect the streamed chunks into one buffer, as the file on disk would be. */
async function zipOf(items: BackupItem[], read = async (it: BackupItem) => new Uint8Array([1, 2, 3, it.bytes % 256])) {
    const chunks: Uint8Array[] = [];
    const result = await zipPhotos(items, read, (c) => chunks.push(c));
    const all = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let o = 0;
    for (const c of chunks) {
        all.set(c, o);
        o += c.length;
    }
    return { result, files: unzipSync(all) };
}

describe('zipPhotos (F4)', () => {
    it('contains every photo plus photos.csv (file name, date, pond, record type, record id)', async () => {
        const a = item('2026-09-20T08:00:00Z');
        const b = item('2026-09-21T08:00:00Z', { entity: 'mortality', pondName: 'Pond, "North"' });
        const { result, files } = await zipOf([a, b]);

        expect(result).toEqual({ saved: 2, missing: 0 });
        expect(Object.keys(files).sort()).toEqual(['001_2026-09-20_disease.webp', '002_2026-09-21_mortality.webp', 'photos.csv']);
        expect([...files['001_2026-09-20_disease.webp']]).toEqual([1, 2, 3, 1000 % 256]);
        expect(strFromU8(files['photos.csv']).split('\n')).toEqual([
            'file,date,pond,record_type,record_id',
            `001_2026-09-20_disease.webp,2026-09-20,Pond 3,disease,${a.recordId}`,
            `002_2026-09-21_mortality.webp,2026-09-21,"Pond, ""North""",mortality,${b.recordId}`,
        ]);
    });

    it('leaves out a photo that fails to download, and says so', async () => {
        const a = item('2026-09-20T08:00:00Z');
        const b = item('2026-09-21T08:00:00Z');
        const { result, files } = await zipOf([a, b], async (it) => {
            if (it === a) throw new Error('404');
            return new Uint8Array([9]);
        });
        expect(result).toEqual({ saved: 1, missing: 1 });
        expect(Object.keys(files).sort()).toEqual(['001_2026-09-21_disease.webp', 'photos.csv']);
        expect(strFromU8(files['photos.csv'])).not.toContain(a.recordId!);
    });
});

describe('planBackup (F4 cap: 50 photos / 200 MB per zip)', () => {
    it('one part when it fits', () => {
        const items = [item('2026-09-01T00:00:00Z'), item('2026-10-01T00:00:00Z')];
        expect(overCap(items)).toBe(false);
        expect(planBackup(items)).toEqual([{ label: null, items }]);
    });

    it('over the photo cap it splits by month, oldest first', () => {
        const sep = Array.from({ length: 30 }, (_, i) => item(`2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`));
        const oct = Array.from({ length: 30 }, (_, i) => item(`2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`));
        const items = [...oct, ...sep];
        expect(overCap(items)).toBe(true);
        const parts = planBackup(items);
        expect(parts.map((p) => [p.label, p.items.length])).toEqual([
            ['2026-09', 30],
            ['2026-10', 30],
        ]);
    });

    it('over the byte cap too; a month that is itself too big is cut into numbered pieces', () => {
        const big = Math.floor(BACKUP_CAP.bytes / 3) + 1; // 3 of these exceed 200 MB
        const items = Array.from({ length: 5 }, (_, i) => item(`2026-09-0${i + 1}T00:00:00Z`, { bytes: big }));
        const parts = planBackup(items);
        expect(parts.map((p) => [p.label, p.items.length])).toEqual([
            ['2026-09', 2],
            ['2026-09-2', 2],
            ['2026-09-3', 1],
        ]);
        expect(parts.every((p) => !overCap(p.items))).toBe(true);
    });
});

describe('backupFilename', () => {
    it('Neerani-photos-<farm>-<pond>-<cycle>.zip, through safeFilename', () => {
        expect(backupFilename(['Green Acres', 'Pond 3', 'Cycle 1'])).toBe('Neerani-photos-Green-Acres-Pond-3-Cycle-1.zip');
        expect(backupFilename(['Green Acres', 'Pond 3', 'Cycle 1'], '2026-09')).toBe(
            'Neerani-photos-Green-Acres-Pond-3-Cycle-1-2026-09.zip',
        );
    });
});

describe('farmPhotoPath', () => {
    const p = `${FARM}/cccccccc-cccc-4ccc-8ccc-cccccccccccc`;
    it('reads the farm-photo path out of a signed URL (full or thumbnail)', () => {
        expect(farmPhotoPath(`https://upcheck-photos.acct.r2.cloudflarestorage.com/health/${p}.webp?X-Amz-Signature=x`)).toBe(`${p}.webp`);
        expect(farmPhotoPath(`https://acct.r2.cloudflarestorage.com/upcheck-photos/health/${p}.thumb.webp?X=1`)).toBe(`${p}.webp`);
    });
    it('null for anything that is not a farm photo', () => {
        expect(farmPhotoPath(`https://x/avatars/${p}.webp?s`)).toBeNull();
        expect(farmPhotoPath('https://x/health/f/a.webp')).toBeNull();
    });
});
