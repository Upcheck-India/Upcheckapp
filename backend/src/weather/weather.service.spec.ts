import { WeatherService } from './weather.service';

const svc = new WeatherService();

describe('WeatherService (farmer_features_spec §8)', () => {
  it('heavy rain raises a salinity-dilution / mineral advisory', () => {
    const r = svc.evaluate({ rainfallMm: 80 });
    expect(r.advisories.some((a) => /dilution/i.test(a.title))).toBe(true);
    expect(r.emergencyHarvestRecommended).toBe(false);
    // Below threshold → no rain advisory.
    expect(svc.evaluate({ rainfallMm: 10 }).advisories.length).toBe(0);
  });

  it('a >3°C temperature drop raises a WSSV advisory', () => {
    expect(svc.evaluate({ tempDropC: 4 }).advisories.some((a) => /WSSV/.test(a.title))).toBe(true);
    expect(svc.evaluate({ tempDropC: 2 }).advisories.length).toBe(0); // ≤3 → none
  });

  it('a cyclone warning triggers the checklist + emergency-harvest evaluation', () => {
    const r = svc.evaluate({ cycloneWarning: true });
    expect(r.preCycloneChecklist).not.toBeNull();
    expect(r.preCycloneChecklist!.length).toBeGreaterThan(3);
    expect(r.emergencyHarvestRecommended).toBe(true);
    expect(r.advisories.some((a) => a.severity === 'critical')).toBe(true);
  });

  it('calm weather produces no advisories', () => {
    const r = svc.evaluate({ rainfallMm: 5, tempDropC: 1, cycloneWarning: false });
    expect(r.advisories).toEqual([]);
    expect(r.preCycloneChecklist).toBeNull();
    expect(r.emergencyHarvestRecommended).toBe(false);
  });
});
