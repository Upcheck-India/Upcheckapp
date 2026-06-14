import { AerationService } from './aeration.service';

const svc = new AerationService();

describe('AerationService (farmer_features_spec §4)', () => {
  it('requiredHP = biomass / 500', () => {
    expect(svc.requiredHp(1000)).toBe(2); // 1 tonne → 2 HP
    expect(svc.requiredHp(2500)).toBe(5);
  });

  it('adequacy deficit sign flags under-aeration', () => {
    const under = svc.adequacy(1000, 1.5);
    expect(under.deficitHp).toBe(0.5);
    expect(under.underAerated).toBe(true);
    expect(under.adequacyRatio).toBe(0.75);

    const ok = svc.adequacy(1000, 3);
    expect(ok.deficitHp).toBe(-1);
    expect(ok.underAerated).toBe(false);
  });

  it('grid power cost uses 1 HP = 0.746 kW', () => {
    // 4 HP × 0.746 × 10 h × ₹8/kWh = ₹238.72
    expect(svc.powerCostGrid(4, 10, 8)).toBe(238.72);
  });

  it('diesel power cost = L/hr × hours × ₹/L', () => {
    expect(svc.powerCostDiesel(2, 10, 90)).toBe(1800);
  });

  it('power cost per kg of shrimp', () => {
    expect(svc.costPerKg(238.72, 1000)).toBe(0.239);
    expect(svc.costPerKg(100, 0)).toBe(0);
  });

  it('night DO-min falls with biomass and rises with aeration', () => {
    const base = {
      currentDo: 6,
      biomassKg: 2000,
      areaM2: 4000,
      installedHp: 4,
      runHours: 6,
    };
    const baseline = svc.predictNightDoMin(base);
    const moreBiomass = svc.predictNightDoMin({ ...base, biomassKg: 4000 });
    const moreAeration = svc.predictNightDoMin({ ...base, runHours: 8 });
    expect(moreBiomass).toBeLessThan(baseline);
    expect(moreAeration).toBeGreaterThan(baseline);
  });

  it('night DO-min clamps to ≥ 0 under extreme load', () => {
    const crash = svc.predictNightDoMin({
      currentDo: 6,
      biomassKg: 40000, // density 10 kg/m²
      areaM2: 4000,
      installedHp: 0,
      runHours: 0,
    });
    expect(crash).toBe(0);
  });

  it('recommends aerator hours to hold DO ≥ target, and 0 when healthy', () => {
    const stressed = {
      currentDo: 6,
      biomassKg: 2000,
      areaM2: 4000,
      installedHp: 4,
    };
    const hours = svc.recommendRunHours(stressed, 4);
    expect(hours).toBeGreaterThan(0);
    // Running that many hours should lift the predicted min to ~target.
    const lifted = svc.predictNightDoMin({ ...stressed, runHours: hours });
    expect(lifted).toBeGreaterThanOrEqual(4 - 0.05);

    // Healthy pond needs no aeration.
    const healthy = svc.recommendRunHours(
      { currentDo: 8, biomassKg: 500, areaM2: 4000, installedHp: 4 },
      4,
    );
    expect(healthy).toBe(0);
  });
});
