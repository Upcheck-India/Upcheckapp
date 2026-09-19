import { missingInputs } from '../engineInputs';
import { harvestTimingRequired, signedInr } from '../harvestTimingInputs';
import { quoteRows, rowsToBands } from '../../api/priceQuotes';

const ready = {
    abwNow: '20', adgNow: '0.3', nNow: '50000', areaM2: '4000', feedPrice: '60', quoteUsable: true,
};

describe('Harvest Timing inputs (H6)', () => {
    it('is ready when every real input is present', () => {
        expect(missingInputs(harvestTimingRequired(ready))).toEqual([]);
    });

    // T1: '' used to become ADG 0, and the engine always said "Harvest now".
    it('ADG null → a missing input, not a zero', () => {
        expect(missingInputs(harvestTimingRequired({ ...ready, adgNow: '' }))).toEqual([
            'engines.common.needsTwoSamplings',
        ]);
    });

    // T2: no DEFAULT_BANDS any more — no usable quote means no answer.
    it('no usable buyer quote → a missing input', () => {
        expect(missingInputs(harvestTimingRequired({ ...ready, quoteUsable: false }))).toEqual([
            'engines.common.needsQuote',
        ]);
    });

    it('signs rupee differences', () => {
        expect(signedInr(-3200)).toBe('−₹3,200');
        expect(signedInr(1100)).toBe('+₹1,100');
    });
});

describe("Today's quote sheet rows (H5.1)", () => {
    it("start from the farm's counts, priced from the last quote", () => {
        expect(
            quoteRows({
                quote: { bands: [{ count: 40, price: 430 }] } as any,
                ageDays: 2,
                status: 'fresh',
                defaultCounts: [30, 40],
            }),
        ).toEqual([
            { count: '30', price: '' },
            { count: '40', price: '430' },
        ]);
    });

    it('fall back to 30..100 with no history', () => {
        expect(quoteRows(null).map((r) => r.count)).toEqual(['30', '40', '50', '60', '70', '80', '100']);
    });

    it('save only priced rows, deduped and sorted', () => {
        expect(
            rowsToBands([
                { count: '50', price: '360' },
                { count: '30', price: '' },
                { count: '40', price: '430' },
                { count: '40', price: '999' },
                { count: 'x', price: '1' },
            ]),
        ).toEqual([
            { count: 40, price: 430 },
            { count: 50, price: 360 },
        ]);
    });
});
