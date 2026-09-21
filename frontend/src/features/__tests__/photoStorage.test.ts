import { formatBytes, groupByMonth, poolLevel } from '../photoStorage';

const LIMITS = { photos: 1000, bytes: 1.5 * 1024 ** 3 };

describe('photo pool helpers (F2)', () => {
    it('formats sizes the way the storage screen shows them', () => {
        expect(formatBytes(320 * 1024)).toBe('320 KB');
        expect(formatBytes(780 * 1024 ** 2)).toBe('780 MB');
        expect(formatBytes(LIMITS.bytes)).toBe('1.5 GB');
        expect(formatBytes(2 * 1024 ** 3)).toBe('2 GB');
    });

    it('warns at 80% and is full at 100% of WHICHEVER limit is closer', () => {
        expect(poolLevel({ photos: 799, bytes: 0 }, LIMITS)).toBe('ok');
        expect(poolLevel({ photos: 800, bytes: 0 }, LIMITS)).toBe('warn');
        expect(poolLevel({ photos: 10, bytes: LIMITS.bytes * 0.85 }, LIMITS)).toBe('warn');
        expect(poolLevel({ photos: 1000, bytes: 0 }, LIMITS)).toBe('full');
        expect(poolLevel({ photos: 3, bytes: LIMITS.bytes }, LIMITS)).toBe('full');
    });

    it('groups a newest-first list by month', () => {
        const it = (uploadedAt: string) => ({ path: uploadedAt, uploadedAt }) as any;
        expect(
            groupByMonth([it('2026-09-20T10:00:00Z'), it('2026-09-01T10:00:00Z'), it('2026-08-30T10:00:00Z')]).map(
                (g) => [g.month, g.items.length],
            ),
        ).toEqual([
            ['2026-09', 2],
            ['2026-08', 1],
        ]);
    });
});
