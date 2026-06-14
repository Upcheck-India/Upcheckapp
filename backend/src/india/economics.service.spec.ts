import { EconomicsService, CountPriceBand } from './economics.service';

const BANDS: CountPriceBand[] = [
  { count: 30, price: 520 },
  { count: 40, price: 430 },
  { count: 50, price: 360 },
];

describe('EconomicsService', () => {
  const e = new EconomicsService();

  it('computes Cost of Production ₹/kg', () => {
    expect(e.coPerKg(312000, 1000)).toBe(312);
    expect(e.coPerKg(100, 0)).toBe(0); // guard
  });

  it('computes profit, margin, ROI', () => {
    // revenue 500000, cost 312000
    expect(e.profit(500000, 312000)).toBe(188000);
    expect(e.marginPct(500000, 312000)).toBeCloseTo(37.6, 1);
    expect(e.roiPct(500000, 312000)).toBeCloseTo(60.26, 1);
  });

  it('computes productivity t/ha (1 kg/m² = 10 t/ha)', () => {
    // jala §12.7 reference: 2084 kg standing on 1000 m² → 20.84 t/ha
    expect(e.productivityTPerHa(2084, 1000)).toBeCloseTo(20.84, 2);
    expect(e.productivityTPerHa(100, 0)).toBeNull();
  });

  it('interpolates break-even count against the price matrix', () => {
    // CoP 400 lies between count40(₹430) and count50(₹360):
    // frac = (430-400)/(430-360) = 30/70 → count = 40 + 0.4286×10 ≈ 44.29
    expect(e.breakEvenCount(400, BANDS)).toBeCloseTo(44.29, 2);
    // Exactly on a band price → that band's count.
    expect(e.breakEvenCount(430, BANDS)).toBeCloseTo(40, 6);
    expect(e.breakEvenCount(520, BANDS)).toBeCloseTo(30, 6);
  });

  it('clamps break-even when CoP is outside the priced range', () => {
    expect(e.breakEvenCount(600, BANDS)).toBe(30); // can't break even; biggest size
    expect(e.breakEvenCount(100, BANDS)).toBe(50); // profitable even at smallest size
    expect(e.breakEvenCount(400, [{ count: 40, price: 430 }])).toBeNull(); // <2 bands
  });

  it('rolls up full crop economics', () => {
    const r = e.compute({
      totalCost: 312000,
      harvestBiomassKg: 1000,
      revenue: 500000,
      areaM2: 4046.86, // 1 acre
      priceBands: BANDS,
    });
    expect(r.coPerKg).toBe(312);
    expect(r.profit).toBe(188000);
    // CoP 312 is below the lowest band price (₹360 @ count50) → profitable across
    // the whole priced range; break-even clamps to the largest priced count.
    expect(r.breakEvenCount).toBe(50);
    expect(r.productivityTPerHa).toBeCloseTo(2.47, 2); // 1000kg/4046.86m²×10
  });
});
