import { CreditService } from './credit.service';

const svc = new CreditService(null as any);

describe('CreditService — pure math (farmer_features_spec §6)', () => {
  it('outstanding = principal × (1 + interest%) − repaid', () => {
    expect(svc.outstanding(10000, 0, 4000)).toBe(6000);
    expect(svc.outstanding(10000, 5, 4000)).toBe(6500); // 10500 − 4000
    expect(svc.outstanding(10000, 0, 12000)).toBe(0); // floored at 0
  });

  it('daysToRunout from burn rate', () => {
    expect(svc.daysToRunout(100, 25)).toBe(4);
    expect(svc.daysToRunout(100, 0)).toBe(Infinity);
  });

  it('reorder when below threshold OR runout within lead time', () => {
    // qty above threshold but runs out within lead time → reorder.
    expect(svc.reorderNeeded(100, 50, 25, 4)).toBe(true); // runout 4 ≤ lead 4
    // Comfortable stock and slow burn → no reorder.
    expect(svc.reorderNeeded(100, 50, 5, 4)).toBe(false); // runout 20 > 4, qty>thr
    // Below threshold always reorders.
    expect(svc.reorderNeeded(40, 50, 1, 100)).toBe(true);
  });
});

describe('CreditService — ledger persistence', () => {
  function makeService(rows: any[]) {
    const store = [...rows];
    const repo = {
      create: (x: any) => ({ ...x }),
      save: jest.fn(async (x: any) => x),
      find: jest.fn(async () => store),
      findOne: jest.fn(
        async ({ where: { id } }: any) =>
          store.find((r) => r.id === id) ?? null,
      ),
    };
    return { svc: new CreditService(repo as any), repo };
  }

  it('lists ledger rows with computed outstanding and a per-dealer summary', async () => {
    const { svc } = makeService([
      {
        id: '1',
        userId: 'u',
        dealerName: 'Avanti',
        principal: 100000,
        interestPct: 0,
        repaid: 40000,
        startDate: '2026-01-01',
      },
      {
        id: '2',
        userId: 'u',
        dealerName: 'Avanti',
        principal: 50000,
        interestPct: 10,
        repaid: 0,
        startDate: '2026-02-01',
      },
      {
        id: '3',
        userId: 'u',
        dealerName: 'CP',
        principal: 30000,
        interestPct: 0,
        repaid: 30000,
        startDate: '2026-03-01',
      },
    ]);
    const list = await svc.list('u');
    expect(list[0].outstanding).toBe(60000); // 100000 − 40000
    const summary = await svc.summary('u');
    // Avanti: 60000 + 55000(=50000×1.1) = 115000; CP: 0
    expect(summary.byDealer.Avanti).toBe(115000);
    expect(summary.byDealer.CP).toBe(0);
    expect(summary.totalOutstanding).toBe(115000);
  });

  it('records a repayment against the right entry', async () => {
    const { svc } = makeService([
      {
        id: '1',
        userId: 'u',
        dealerName: 'Avanti',
        principal: 100000,
        interestPct: 0,
        repaid: 0,
        startDate: '2026-01-01',
      },
    ]);
    const updated = await svc.recordRepayment('1', 25000, 'u');
    expect(updated.repaid).toBe(25000);
  });
});
