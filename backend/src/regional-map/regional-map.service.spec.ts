import { RegionalMapService, DiseaseReport } from './regional-map.service';

const svc = new RegionalMapService();

// A tight cluster of WSSV reports near (16.50, 80.60) from 4 distinct farms.
const cluster = (farm: string, lat: number, lon: number, daysAgo = 2): DiseaseReport => ({
  farmId: farm,
  lat,
  lon,
  disease: 'WSSV',
  daysAgo,
});

describe('RegionalMapService (farmer_features_spec §9)', () => {
  it('haversine distance is correct', () => {
    // 1° of longitude at the equator ≈ 111.19 km.
    expect(svc.haversineKm(0, 0, 0, 1)).toBeCloseTo(111.19, 0);
    expect(svc.haversineKm(16.5, 80.6, 16.5, 80.6)).toBe(0);
  });

  it('suppresses the regional risk below the k-anonymity floor', () => {
    const reports = [cluster('f1', 16.51, 80.61), cluster('f2', 16.52, 80.62)];
    const r = svc.regionalRiskFactor({
      pondLat: 16.5, pondLon: 80.6, reports, disease: 'WSSV', radiusKm: 5, days: 7, k: 3,
    });
    expect(r.suppressed).toBe(true); // only 2 farms < k=3
    expect(r.riskFactor).toBe(0);
  });

  it('raises risk when ≥ k distinct farms report nearby', () => {
    const reports = [
      cluster('f1', 16.51, 80.61),
      cluster('f2', 16.52, 80.62),
      cluster('f3', 16.49, 80.59),
      cluster('f4', 16.5, 80.6),
    ];
    const r = svc.regionalRiskFactor({
      pondLat: 16.5, pondLon: 80.6, reports, disease: 'WSSV', radiusKm: 5, days: 7, k: 3,
    });
    expect(r.suppressed).toBe(false);
    expect(r.distinctFarms).toBe(4);
    expect(r.riskFactor).toBeCloseTo(0.8, 2); // 0.2 × 4
  });

  it('excludes reports outside the radius or time window', () => {
    const reports = [
      cluster('f1', 16.51, 80.61),
      cluster('f2', 16.52, 80.62),
      cluster('f3', 18.0, 83.0), // far away (>100 km)
      cluster('f4', 16.5, 80.6, 30), // 30 days ago (outside window)
    ];
    const r = svc.regionalRiskFactor({
      pondLat: 16.5, pondLon: 80.6, reports, radiusKm: 5, days: 7, k: 3,
    });
    expect(r.distinctFarms).toBe(2); // f3 (far) + f4 (old) excluded
    expect(r.suppressed).toBe(true);
  });

  it('heatmap suppresses cells below k distinct farms', () => {
    const reports = [
      // Cell A: 3 farms → surfaced.
      cluster('f1', 16.50, 80.60), cluster('f2', 16.51, 80.61), cluster('f3', 16.49, 80.59),
      // Cell B (far): 1 farm → suppressed.
      cluster('f9', 18.00, 83.00),
    ];
    const cells = svc.buildHeatmap(reports, { gridDeg: 0.05, k: 3 });
    expect(cells).toHaveLength(1);
    expect(cells[0].farms).toBe(3);
    expect(cells[0].diseases).toEqual(['WSSV']);
  });
});
