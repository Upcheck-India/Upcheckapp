import { parseGroupedNumber } from '../parseNumericInput';
import { countFromAbw, draftsFor, parseGrades, priceOutOfBand, summarize } from '../harvestGrades';

describe('parseGroupedNumber', () => {
    it.each([
        ['1,500', 1500],
        ['3,52,600', 352600],
        ['1,50,000.5', 150000.5],
        ['1,234,567', 1234567],
        ['820', 820],
        ['42.5', 42.5],
        ['1,5', null],
        ['1,,500', null],
        ['12abc', null],
        ['', null],
    ])('%s → %s', (raw, expected) => {
        expect(parseGroupedNumber(raw)).toBe(expected);
    });
});

describe('parseGrades', () => {
    it('parses rows; blank count/price are "not given"', () => {
        expect(parseGrades([{ kg: '1,200', count: '', price: '' }])).toEqual({
            grades: [{ id: undefined, weightKg: 1200, countPerKg: null, pricePerKg: null }],
            error: null,
        });
    });
    it('flags the first bad field', () => {
        expect(parseGrades([{ kg: '0', count: '', price: '' }]).error).toEqual({ index: 0, field: 'weight' });
        expect(parseGrades([{ kg: '10', count: '9', price: '' }]).error).toEqual({ index: 0, field: 'count' });
        expect(parseGrades([{ kg: '10', count: '401', price: '' }]).error).toEqual({ index: 0, field: 'count' });
        expect(parseGrades([{ kg: '10', count: '40', price: 'x' }]).error).toEqual({ index: 0, field: 'price' });
    });
    it('price band is a warning, not a parse error', () => {
        const { grades, error } = parseGrades([{ kg: '10', count: '40', price: '4300' }]);
        expect(error).toBeNull();
        expect(priceOutOfBand(grades[0])).toBe(true);
    });
});

describe('summarize (mirrors backend harvestTotals)', () => {
    it('counted grades', () => {
        expect(
            summarize(
                [
                    { weightKg: 820, countPerKg: 40, pricePerKg: 430 },
                    { weightKg: 160, countPerKg: 55, pricePerKg: 340 },
                ],
                null,
            ),
        ).toEqual({ weightKg: 980, totalRupees: 407000, pieces: 41600, piecesEstimated: false, avgCount: 42 });
    });
    it('a missing price → no total; no count → pieces from ABW, estimated', () => {
        const s = summarize([{ weightKg: 500, countPerKg: null, pricePerKg: null }], 20);
        expect(s).toMatchObject({ totalRupees: null, pieces: 25000, piecesEstimated: true, avgCount: null });
    });
});

describe('draftsFor', () => {
    it('reads an old ungraded harvest as one implicit line', () => {
        expect(draftsFor({ grades: [], weightKg: 500, averageSize: 25, salePriceTotal: '200000.00' })).toEqual([
            { kg: '500', count: '40', price: '400' },
        ]);
    });
    it('keeps stored grade ids for replace-all', () => {
        expect(draftsFor({ grades: [{ id: 'g1', weightKg: 10, countPerKg: 40, pricePerKg: null }] })).toEqual([
            { id: 'g1', kg: '10', count: '40', price: '' },
        ]);
    });
    it('count prefill from ABW', () => {
        expect(countFromAbw(23.8)).toBe(42);
        expect(countFromAbw(null)).toBeNull();
    });
});
