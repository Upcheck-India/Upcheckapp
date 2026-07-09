// Day-of-culture must be counted on LOCAL calendar days. `new Date('YYYY-MM-DD')`
// is UTC midnight; for positive-offset zones (IST +5:30) subtracting a local
// `now` and flooring dropped/added a whole day depending on the time of day.
import { computeDOC } from '../activeFarmStore';

const isoLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('activeFarmStore.computeDOC', () => {
    afterEach(() => jest.useRealTimers());

    it('treats a YYYY-MM-DD stocking date as a local calendar day', () => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 6, 9, 2, 30, 0)); // 09 Jul 2026 02:30 local
        const now = new Date();
        const today = isoLocal(now);
        const tenDaysAgo = isoLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10));

        expect(computeDOC(today, 0)).toBe(1); // 1-based: stocked today → DOC 1
        expect(computeDOC(today, 3)).toBe(4); // initial age added
        expect(computeDOC(tenDaysAgo, 0)).toBe(11);
    });

    it('does not drift as the clock moves through the day', () => {
        const stock = '2026-07-01';
        jest.useFakeTimers().setSystemTime(new Date(2026, 6, 9, 0, 5, 0)); // 00:05 local
        const early = computeDOC(stock, 0);
        jest.setSystemTime(new Date(2026, 6, 9, 23, 55, 0)); // 23:55 local
        const late = computeDOC(stock, 0);
        // 1-based, local calendar: 01→09 Jul is 8 elapsed days → DOC 9, stable
        // across the day (UTC-parse+floor would drift 8→9).
        expect(early).toBe(9);
        expect(late).toBe(9);
    });
});
