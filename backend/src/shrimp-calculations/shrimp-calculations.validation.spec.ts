import { ShrimpCalculationsService } from './shrimp-calculations.service';

/**
 * Validates the existing Farm Calculators against the VERBATIM worked examples
 * in jala_teardown.md §11 + the reference formulas in §13. These are the
 * spec's own numbers — if a formula drifts, these fail.
 */
describe('ShrimpCalculations — spec worked examples (jala §11/§13)', () => {
  const svc = new ShrimpCalculationsService();

  it('§11.1 Cultivation Performance — Feed 60kg, FR 2%, ABW 25g, stock 10 lakh', () => {
    // Biomass = 60 / 0.02 = 3000 kg; Population = 3000×1000/25 = 120,000;
    // SR vs 1,000,000 stocked = 12%.
    const r = svc.calculateCultivationPerformance(60, 2, 25, 3000, 1_000_000);
    expect(r.biomass).toBe(3000);
    expect(r.population).toBe(120_000);
    expect(r.sr).toBe(12);
    expect(r.fcr).toBe(1); // running FCR = cumulative 3000 / standing biomass 3000

    // Discriminating case (cumulative ≠ biomass) so the assertion can't pass for
    // an inverted/wrong formula: running FCR = 4500 / 3000 = 1.5 (jala §10).
    const r2 = svc.calculateCultivationPerformance(60, 2, 25, 4500, 1_000_000);
    expect(r2.biomass).toBe(3000);
    expect(r2.fcr).toBe(1.5);
  });

  it('§11.2 Daily Feed = Biomass × FR/100', () => {
    // Biomass 3000 kg at FR 2% → 60 kg/day.
    expect(svc.calculateDailyFeed(3000, 2)).toBe(60);
  });

  it('§11.3 Product Dosage = Area × Level × ppm / 1000', () => {
    // 5000 m² × 1 m × 2 ppm / 1000 = 10 kg.
    expect(svc.calculateProductDosage(5000, 1, 2).amountKg).toBe(10);
  });

  it('§11.4 Free Ammonia — NH3 = TAN/(1+10^(pKa−pH)), pKa = 0.09018 + 2729.92/(T+273.15)', () => {
    // TAN 2 mg/L, pH 8, T 30°C → pKa 9.0954, NH3 ≈ 0.1487 mg/L → warning band.
    const r = svc.calculateFreeAmmonia(2, 8, 30);
    expect(r.unionizedAmmonia).toBeCloseTo(0.1487, 3);
    expect(r.toxicityLevel).toBe('warning');
    // Higher pH drives far more toxic un-ionized fraction.
    expect(svc.calculateFreeAmmonia(2, 9, 30).unionizedAmmonia).toBeGreaterThan(
      r.unionizedAmmonia,
    );
  });

  it('§11.4b Salinity correction (Bower & Bidwell 1978) — brackish water is less toxic', () => {
    // Default (no salinity) == explicit freshwater S=0 (backward compatible).
    const fresh = svc.calculateFreeAmmonia(2, 8, 30).unionizedAmmonia;
    expect(svc.calculateFreeAmmonia(2, 8, 30, 0).unionizedAmmonia).toBe(fresh);
    expect(fresh).toBeCloseTo(0.1486, 3);
    // Higher salinity raises pKa → LESS un-ionised ammonia at the same TAN/pH/temp.
    const brackish = svc.calculateFreeAmmonia(2, 8, 30, 25).unionizedAmmonia;
    const marine = svc.calculateFreeAmmonia(2, 8, 30, 35).unionizedAmmonia;
    expect(brackish).toBeLessThan(fresh);
    expect(marine).toBeLessThan(brackish);
    expect(brackish).toBeCloseTo(0.1267, 3);
  });

  it('§13 reference: Population = Biomass_kg × 1000 / ABW_g', () => {
    expect(svc.calculateBiomass(120_000, 25)).toBe(3000); // stock×ABW/1000
  });

  it('§13 reference: FCR = cumulative feed / biomass gain', () => {
    // Formula 1227/1000 = 1.227; the calculator rounds to 2 dp → 1.23.
    expect(svc.calculateFcr(1227, 1000)).toBeCloseTo(1.227, 2);
    expect(svc.calculateFcr(1227, 1000)).toBe(1.23);
  });

  it('§13 reference: SR = N/N₀ × 100', () => {
    expect(svc.calculateSurvivalRate(1_000_000, 120_000)).toBe(12);
  });

  it('§8 growth: ADG = ΔABW / Δdays', () => {
    // 20 g → 22.8 g over 7 days → 0.40 g/day (the spec's ~0.40 late-stage ADG).
    expect(svc.calculateAdg(20, 22.8, 7)).toBeCloseTo(0.4, 2);
  });
});
