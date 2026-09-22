import { formatBytes, groupByMonth, poolFraction, poolLevel } from '../photoStorage';

const LIMITS = { photos: 500, bytes: 300 * 1024 ** 2 };

describe('photo pool helpers (F2)', () => {
    it('formats sizes the way the storage screen shows them', () => {
        expect(formatBytes(320 * 1024)).toBe('320 KB');
        expect(formatBytes(780 * 1024 ** 2)).toBe('780 MB');
        expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GB');
        expect(formatBytes(2 * 1024 ** 3)).toBe('2 GB');
    });

    it('warns at 80%, warns harder at 95%, and is full at 100% of the photo limit', () => {
        expect(poolLevel({ photos: 399, bytes: 0 }, LIMITS)).toBe('ok');
        expect(poolLevel({ photos: 400, bytes: 0 }, LIMITS)).toBe('warn');
        expect(poolLevel({ photos: 474, bytes: 0 }, LIMITS)).toBe('warn');
        expect(poolLevel({ photos: 475, bytes: 0 }, LIMITS)).toBe('critical');
        expect(poolLevel({ photos: 500, bytes: 0 }, LIMITS)).toBe('full');
    });

    it('shows photos only: bytes never drive the percentage, but the hidden backstop still means full', () => {
        expect(poolFraction({ photos: 10, bytes: LIMITS.bytes * 0.9 }, LIMITS)).toBe(0.02);
        expect(poolLevel({ photos: 10, bytes: LIMITS.bytes * 0.9 }, LIMITS)).toBe('ok');
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
