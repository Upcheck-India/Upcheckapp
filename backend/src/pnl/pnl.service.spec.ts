import { PnlService } from './pnl.service';
import { EconomicsService } from '../india/economics.service';

const expenses = [
  { category: 'Feed', amount: 200000 },
  { category: 'Seed (Fry)', amount: 50000 },
  { category: 'Energy (Fuel/Electricity)', amount: 62000 },
];
const harvests = [
  { weightKg: 600, salePriceTotal: 300000, harvestType: 'partial' },
  { weightKg: 400, salePriceTotal: 200000, harvestType: 'full' },
];

function makeService() {
  const expenseRepo = { find: jest.fn().mockResolvedValue(expenses) };
  const harvestRepo = { find: jest.fn().mockResolvedValue(harvests) };
  const pricing = { latestForRegion: jest.fn(), bandsFromPrices: jest.fn() };
  const cropRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'crop-1', pondId: 'pond-1' }),
  };
  const farmAccess = { assertCanAccessPond: jest.fn().mockResolvedValue({}) };
  const svc = new PnlService(
    expenseRepo as any,
    harvestRepo as any,
    cropRepo as any,
    new EconomicsService(),
    pricing as any,
    farmAccess as any,
  );
  return { svc, cropRepo, farmAccess };
}

describe('PnlService.computeCropPnl (farmer_features_spec §5)', () => {
  it('aggregates the expense ledger and harvest revenue into CoP/profit', async () => {
    const { svc, farmAccess } = makeService();
    const r = await svc.computeCropPnl('crop-1', 'user-1', { areaM2: 4046.86 });

    // VIEW_FINANCIALS on the crop's pond (owner or manager), matching the
    // expenses.getCycleFinancials authorization path.
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith(
      'user-1',
      'pond-1',
      'VIEW_FINANCIALS',
    );
    expect(r.totalCost).toBe(312000);
    expect(r.revenue).toBe(500000);
    expect(r.harvestBiomassKg).toBe(1000);
    expect(r.coPerKg).toBe(312); // 312000 / 1000
    expect(r.profit).toBe(188000);
    expect(r.marginPct).toBe(37.6);
    expect(r.roiPct).toBe(60.26);
    expect(r.productivityTPerHa).toBe(2.47); // 1000kg / 4046.86 m² × 10
    expect(r.harvestComplete).toBe(true); // a 'full' harvest exists
  });

  it('breaks cost down by category', async () => {
    const { svc } = makeService();
    const r = await svc.computeCropPnl('crop-1', 'user-1');
    expect(r.costBreakdown).toEqual({
      Feed: 200000,
      'Seed (Fry)': 50000,
      'Energy (Fuel/Electricity)': 62000,
    });
  });
});
