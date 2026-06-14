import { CropOutcomeService } from './crop-outcome.service';
import { EconomicsService } from '../india/economics.service';

function makeService(existing: any = null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(existing),
    create: (x: any) => ({ ...x }),
    save: jest.fn(async (x: any) => ({ id: 'out-1', ...x })),
  };
  return { svc: new CropOutcomeService(repo as any, new EconomicsService()), repo };
}

describe('CropOutcomeService (data_collection_audit §5)', () => {
  const { svc } = makeService();

  it('classifies outcomes by survival / profit / crash', () => {
    expect(svc.classifyOutcome(75, 100000, false, false)).toBe('success');
    expect(svc.classifyOutcome(55, 50000, false, false)).toBe('partial'); // SR < 60
    expect(svc.classifyOutcome(80, -5000, false, false)).toBe('partial'); // loss
    expect(svc.classifyOutcome(30, 100000, false, false)).toBe('failure'); // SR < 40
    expect(svc.classifyOutcome(80, 100000, true, false)).toBe('failure'); // crash
    expect(svc.classifyOutcome(80, 100000, false, true)).toBe('failure'); // emergency
  });

  it('scores data completeness from modules + logged days', () => {
    expect(
      svc.dataCompletenessScore({ modulesCovered: 8, modulesTotal: 10, loggedDays: 90, cultivationDays: 120 }),
    ).toBe(0.78); // 0.5×0.8 + 0.5×0.75
    expect(svc.dataCompletenessScore({})).toBe(0);
  });

  it('derives the full label record with economics', () => {
    const out = svc.deriveOutcome({
      finalSrPct: 72,
      finalFcr: 1.23,
      finalCount: 40,
      totalYieldKg: 1000,
      areaM2: 4046.86,
      cultivationDays: 120,
      revenue: 500000,
      totalCost: 312000,
      modulesCovered: 10,
      modulesTotal: 10,
      loggedDays: 120,
    });
    expect(out.profit).toBe(188000);
    expect(out.copPerKg).toBe(312);
    expect(out.marginPct).toBe(37.6);
    expect(out.productivityTPerHa).toBe(2.47);
    expect(out.outcomeClass).toBe('success');
    expect(out.dataCompletenessScore).toBe(1);
  });

  it('freezes once and rejects re-freezing (immutability)', async () => {
    const fresh = makeService(null);
    await expect(fresh.svc.freeze('crop-1', 'u', { totalYieldKg: 1000, revenue: 1, totalCost: 1 })).resolves.toBeDefined();

    const already = makeService({ id: 'x', cropId: 'crop-1' });
    await expect(
      already.svc.freeze('crop-1', 'u', { totalYieldKg: 1 }),
    ).rejects.toThrow(/already frozen/i);
  });
});
