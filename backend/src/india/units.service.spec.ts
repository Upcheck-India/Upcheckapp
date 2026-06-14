import { UnitsService } from './units.service';

/**
 * Validates the india §1 conversions + §11 round-trip unit tests
 * (acres↔m², lakh↔PL, ABW↔count) against the spec's documented numbers.
 */
describe('UnitsService', () => {
  const u = new UnitsService();

  it('converts area units to the spec factors', () => {
    expect(u.acresToM2(1)).toBeCloseTo(4046.86, 2);
    expect(u.centsToM2(1)).toBeCloseTo(40.4686, 4);
    expect(u.hectaresToM2(1)).toBe(10000);
    // 1 acre = 100 cents
    expect(u.acresToM2(1)).toBeCloseTo(u.centsToM2(100), 2);
  });

  it('round-trips acres ↔ m²', () => {
    for (const acres of [0.5, 1, 2.5, 4]) {
      expect(u.m2ToAcres(u.acresToM2(acres))).toBeCloseTo(acres, 9);
    }
  });

  it('converts lakh ↔ PL and round-trips', () => {
    expect(u.lakhToCount(4)).toBe(400000);
    expect(u.countToLakh(400000)).toBe(4);
    expect(u.countToLakh(u.lakhToCount(1.6))).toBeCloseTo(1.6, 9);
  });

  it('converts ABW ↔ count per size = 1000/ABW and round-trips', () => {
    // "count 30" = 30 pcs/kg = 33.33 g (india §1)
    expect(u.countToAbw(30)).toBeCloseTo(33.3333, 3);
    expect(u.abwToCount(33.3333)).toBeCloseTo(30, 3);
    expect(u.abwToCount(25)).toBe(40); // 25 g → count 40
    for (const abw of [10, 22.2, 33.33, 50]) {
      expect(u.countToAbw(u.abwToCount(abw))).toBeCloseTo(abw, 6);
    }
  });

  it('computes stocking density (PL/m²)', () => {
    // 4 lakh in 1 acre ≈ 98.8 PL/m² (semi-intensive band)
    const density = u.stockingDensity(u.lakhToCount(4), u.acresToM2(1));
    expect(density).toBeCloseTo(98.84, 1);
  });

  it('toM2 dispatches by unit', () => {
    expect(u.toM2(2, 'acre')).toBeCloseTo(8093.72, 2);
    expect(u.toM2(50, 'cent')).toBeCloseTo(2023.43, 2);
    expect(u.toM2(500, 'm2')).toBe(500);
  });
});
