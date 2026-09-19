import { PnlService } from './pnl.service';
import { EconomicsService } from '../india/economics.service';

// What `getCycleFinancials` returns for the cycle: expenses AND pond-tagged
// transactions in one basis (C5).
const financials = {
  totalRevenue: 500000,
  totalExpenses: 312000,
  netProfit: 188000,
  marginPercent: 37.6,
  totalHarvestKg: 1000,
  breakEvenPricePerKg: 312,
  expensesByCategory: {
    Feed: 200000,
    'Seed (Fry)': 50000,
    'Energy (Fuel/Electricity)': 62000,
  },
};

function makeService(pond: any = { calculatedAreaM2: 4046.86 }) {
  const harvestRepo = { count: jest.fn().mockResolvedValue(1) };
  const pricing = { latestForRegion: jest.fn(), bandsFromPrices: jest.fn() };
  const cropRepo = {
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 'crop-1', pondId: 'pond-1', pond }),
  };
  const farmAccess = { assertCanAccessPond: jest.fn().mockResolvedValue({}) };
  const expenses = {
    getCycleFinancials: jest.fn().mockResolvedValue(financials),
  };
  const svc = new PnlService(
    harvestRepo as any,
    cropRepo as any,
    new EconomicsService(),
    pricing as any,
    farmAccess as any,
    expenses as any,
  );
  return { svc, cropRepo, farmAccess, harvestRepo, expenses };
}

describe('PnlService.computeCropPnl (farmer_features_spec §5)', () => {
  // B9: only a SOLD full harvest completes the cycle.
  it('counts only SOLD full harvests as complete', async () => {
    const { svc, harvestRepo } = makeService();
    await svc.computeCropPnl('crop-1', 'user-1');
    expect(harvestRepo.count).toHaveBeenCalledWith({
      where: { cropId: 'crop-1', status: 'sold', harvestType: 'full' },
    });
  });

  it('reads money from getCycleFinancials — one basis with Cycle financials (C5)', async () => {
    const { svc, farmAccess, expenses } = makeService();
    const r = await svc.computeCropPnl('crop-1', 'user-1', { areaM2: 4046.86 });

    expect(expenses.getCycleFinancials).toHaveBeenCalledWith('crop-1', 'user-1');
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith(
      'user-1',
      'pond-1',
      'VIEW_FINANCIALS',
    );
    expect(r.totalCost).toBe(312000);
    expect(r.revenue).toBe(500000);
    expect(r.harvestBiomassKg).toBe(1000);
    expect(r.coPerKg).toBe(312);
    expect(r.profit).toBe(financials.netProfit);
    expect(r.marginPct).toBe(37.6);
    expect(r.roiPct).toBe(60.26);
    expect(r.productivityTPerHa).toBe(2.47);
    expect(r.harvestComplete).toBe(true);
  });

  // C3: no caller passed areaM2, so t/ha was always null.
  it("defaults t/ha to the pond's own area", async () => {
    const { svc } = makeService({ calculatedAreaM2: '4046.86', overrideAreaM2: null });
    const r = await svc.computeCropPnl('crop-1', 'user-1');
    expect(r.productivityTPerHa).toBe(2.47);
  });

  it('leaves t/ha null when the pond has no area', async () => {
    const { svc } = makeService({ calculatedAreaM2: 0 });
    const r = await svc.computeCropPnl('crop-1', 'user-1');
    expect(r.productivityTPerHa).toBeNull();
  });

  it('breaks cost down by category', async () => {
    const { svc } = makeService();
    const r = await svc.computeCropPnl('crop-1', 'user-1');
    expect(r.costBreakdown).toEqual(financials.expensesByCategory);
  });
});
