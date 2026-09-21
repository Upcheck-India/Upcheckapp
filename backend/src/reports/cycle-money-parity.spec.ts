import { ExpensesService } from '../finances/expenses.service';
import { PnlService } from '../pnl/pnl.service';
import { EconomicsService } from '../india/economics.service';
import { ReportsService } from './reports.service';

/**
 * C5: one profit number per cycle, everywhere. Crop P&L used to read the
 * `expenses` table alone while Cycle financials also counted pond-tagged
 * Money-screen transactions — two profits for one cycle. All three readers
 * now go through the REAL `getCycleFinancials`; a pond-tagged transaction
 * (₹20,000 here) is what would expose a second basis.
 */
describe('one profit per cycle: Cycle Result = Crop P&L = Cycle financials', () => {
  const crop = {
    id: 'crop-1',
    pondId: 'pond-1',
    status: 'completed',
    stockingDate: '2026-06-01',
    actualHarvestDate: new Date('2026-09-10T06:00:00.000Z'),
    stockingCount: 100000,
    createdAt: new Date('2026-05-25T00:00:00.000Z'),
    pond: { id: 'pond-1', status: 'active', calculatedAreaM2: 2000 },
  };
  const harvests = [
    {
      id: 'h1', status: 'sold', harvestType: 'full', harvestDate: '2026-09-10',
      weightKg: 1000, salePriceTotal: '400000.00', averageSize: 25, pieces: 40000,
      piecesEstimated: false, grades: [],
    },
  ];

  const build = () => {
    const qb: any = {
      where: () => qb, andWhere: () => qb, orderBy: () => qb, take: () => qb,
      getMany: async () => [
        { id: 't1', pondId: 'pond-1', type: 'expense', category: 'Diesel', amount: '20000',
          transactionDate: new Date('2026-07-01T06:00:00.000Z'), createdAt: new Date() },
      ],
    };
    const farmAccess = { assertCanAccessPond: jest.fn().mockResolvedValue({}) };
    const harvestsService = { findAll: jest.fn().mockResolvedValue(harvests) };
    const expenses = new ExpensesService(
      { find: jest.fn().mockResolvedValue([
        { id: 'e1', cropId: 'crop-1', date: '2026-06-10', category: 'Feed', amount: '250000' },
      ]) } as any,
      { findOne: jest.fn().mockResolvedValue(crop) } as any,
      harvestsService as any,
      farmAccess as any,
      { createQueryBuilder: () => qb } as any,
      { assertFarmPaths: jest.fn(), applyRecordPhotos: jest.fn() } as any,
    );
    const pnl = new PnlService(
      { count: jest.fn().mockResolvedValue(1) } as any,
      { findOne: jest.fn().mockResolvedValue(crop) } as any,
      new EconomicsService(),
      {} as any,
      farmAccess as any,
      expenses,
    );
    const reports = new ReportsService(
      { findOneAccessible: jest.fn().mockResolvedValue(crop.pond) } as any,
      {} as any,
      {} as any,
      harvestsService as any,
      expenses,
      { findAll: jest.fn().mockResolvedValue([]) } as any,
      { findOneAccessible: jest.fn().mockResolvedValue(crop) } as any,
      {} as any,
      {} as any,
      {
        query: jest.fn(async (sql: string) =>
          sql.includes('feed_records') ? [{ tagged: 1200, untagged: 0, untaggedN: 0 }] : [],
        ),
      } as any,
    );
    return { expenses, pnl, reports };
  };

  it('prints the same profit on all three', async () => {
    const { expenses, pnl, reports } = build();
    const fin = await expenses.getCycleFinancials('crop-1', 'u');
    const p = await pnl.computeCropPnl('crop-1', 'u');
    const r = await reports.getCycleResult('crop-1', 'u');

    // 400,000 − (250,000 expense + 20,000 pond-tagged transaction).
    expect(fin.netProfit).toBe(130000);
    expect(p.profit).toBe(fin.netProfit);
    expect(p.totalCost).toBe(fin.totalExpenses);
    expect(r.money?.profit).toBe(fin.netProfit);
    expect(r.money?.cost).toBe(fin.totalExpenses);
  });
});
