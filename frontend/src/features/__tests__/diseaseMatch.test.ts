import { matchDiseases } from '../diseaseMatch';

describe('matchDiseases', () => {
    it('returns nothing for no symptoms', () => {
        expect(matchDiseases([])).toEqual([]);
    });

    it('ranks WSSV top for its primary signs', () => {
        const res = matchDiseases(['white_spots', 'reduced_feeding', 'lethargy']);
        expect(res[0].key).toBe('wssv');
        expect(res[0].score).toBe(9); // three primaries × 3
        expect(res[0].confidence).toBeGreaterThan(0);
        expect(res[0].confidence).toBeLessThanOrEqual(100);
    });

    it('ranks White Feces Syndrome top for white feces + reduced feeding', () => {
        const res = matchDiseases(['white_feces', 'reduced_feeding']);
        expect(res[0].key).toBe('wfs');
    });

    it('caps results to the limit and only returns scored diseases', () => {
        const res = matchDiseases(['reduced_feeding'], 3); // shared secondary/primary across many
        expect(res.length).toBeLessThanOrEqual(3);
        res.forEach((m) => expect(m.score).toBeGreaterThan(0));
    });

    it('orders by score descending', () => {
        const res = matchDiseases(['white_spots', 'reduced_feeding', 'black_gills']);
        for (let i = 1; i < res.length; i++) {
            expect(res[i - 1].score).toBeGreaterThanOrEqual(res[i].score);
        }
    });

    it('confidence reflects share of a disease profile matched', () => {
        // Black Gill: 1 primary (3) + 4 secondary (4) = total 7; selecting only the
        // primary gives 3/7 ≈ 43%.
        const res = matchDiseases(['black_gills']);
        const bg = res.find((m) => m.key === 'black_gill');
        expect(bg?.confidence).toBe(43);
    });
});
