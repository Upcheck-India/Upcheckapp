import { ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';

const missing = (code: '42P01' | '42703') =>
  Object.assign(new Error(`missing (${code})`), { code });

const baseCrop = {
  id: 'crop-1',
  pondId: 'pond-1',
  status: 'completed',
  stockingDate: '2026-06-01',
  actualHarvestDate: new Date('2026-09-10T06:00:00.000Z'),
  stockingCount: 100000,
  createdAt: new Date('2026-05-25T00:00:00.000Z'),
};
const basePond = {
  id: 'pond-1',
  name: 'Pond 3',
  calculatedAreaM2: 2000,
  overrideAreaM2: null,
  assumedFields: [] as string[],
};
const baseFin = {
  totalRevenue: 400000,
  totalExpenses: 300000,
  netProfit: 100000,
  marginPercent: 25,
  totalHarvestKg: 1000,
  breakEvenPricePerKg: 300,
  expensesByCategory: {},
};
const fullHarvest = (over: any = {}) => ({
  id: 'h1',
  status: 'sold',
  harvestType: 'full',
  harvestDate: '2026-09-10',
  weightKg: 1000,
  averageSize: 25,
  pieces: 40000,
  piecesEstimated: false,
  rejectedKg: null,
  rejectedReason: null,
  grades: [{ countPerKg: 40, weightKg: 1000, pricePerKg: 400 }],
  ...over,
});

/**
 * `sql` routes a raw query to rows by a substring of its SQL. An Error value
 * is thrown — how a not-yet-applied migration looks from here.
 */
const build = (over: any = {}) => {
  const sql: Record<string, any> = {
    feed_records: [{ tagged: 1200, untagged: 0, untaggedN: 0 }],
    ...over.sql,
  };
  const dataSource = {
    query: jest.fn(async (text: string, _params?: unknown[]) => {
      for (const [needle, value] of Object.entries(sql)) {
        if (text.includes(needle)) {
          if (value instanceof Error) throw value;
          return value;
        }
      }
      return [];
    }),
  };
  const crop = { ...baseCrop, ...over.crop };
  const cropsService = {
    findOne: jest.fn().mockResolvedValue(crop),
    findOneAccessible: jest.fn().mockResolvedValue(crop),
  };
  const pondsService = {
    findOneAccessible: jest.fn().mockResolvedValue({ ...basePond, ...over.pond }),
  };
  const harvestsService = {
    findAll: jest.fn().mockResolvedValue(over.harvests ?? [fullHarvest()]),
  };
  const samplingService = {
    findAll: jest.fn().mockResolvedValue(over.samplings ?? []),
  };
  const expensesService = {
    getCycleFinancials:
      over.getCycleFinancials ?? jest.fn().mockResolvedValue(baseFin),
  };
  const service = new ReportsService(
    pondsService as any,
    {} as any, // inventoryService
    {} as any, // feedRecordsService — pond-lifetime feed is no longer read (C2)
    harvestsService as any,
    expensesService as any,
    samplingService as any,
    cropsService as any,
    {} as any, // farmAccess
    {} as any, // transactionsService
    dataSource as any,
  );
  return { service, dataSource, cropsService, samplingService, harvestsService, expensesService };
};

describe('ReportsService.getCycleResult (harvest-and-molt H3)', () => {
  it('FCR = crop-tagged feed ÷ harvested kg, untagged pond rows counted and noted', async () => {
    const { service, dataSource } = build({
      sql: { feed_records: [{ tagged: 1200, untagged: 100, untaggedN: 3 }] },
    });
    const r = await service.getCycleResult('crop-1', 'user-1');

    expect(r.feedKg).toBe(1300);
    expect(r.untaggedFeedLogs).toBe(3);
    expect(r.fcr).toBe(1.3);
    // Scoped to this crop (+ this pond's untagged rows), never pond-lifetime.
    const [text, params] = dataSource.query.mock.calls.find(([s]) =>
      s.includes('feed_records'),
    )!;
    expect(text).toContain('crop_id = $1');
    expect(text).toContain('crop_id IS NULL AND pond_id = $2');
    expect(params!.slice(0, 2)).toEqual(['crop-1', 'pond-1']);
  });

  it('FCR is null (not 0) when no feed was logged', async () => {
    const { service } = build({ sql: { feed_records: [{ tagged: 0, untagged: 0, untaggedN: 0 }] } });
    expect((await service.getCycleResult('crop-1', 'u')).fcr).toBeNull();
  });

  it('survival comes from harvested pieces, never the sampling SR estimate', async () => {
    const { service } = build({
      harvests: [fullHarvest({ pieces: 70000 })],
      samplings: [{ samplingDate: '2026-09-01', mbwG: 24, srEstimationPercent: 88 }],
    });
    const r = await service.getCycleResult('crop-1', 'u');
    expect(r.survival).toEqual({ pct: 70, low: null, high: null, estimated: false });
  });

  it('estimated pieces give a ±10% ABW range and the estimated tag', async () => {
    const { service } = build({
      harvests: [fullHarvest({ pieces: null, averageSize: null, grades: [] })],
      samplings: [{ samplingDate: '2026-09-01', mbwG: 20 }],
    });
    const r = await service.getCycleResult('crop-1', 'u');
    // 1000 kg at 20 g = 50,000 pieces of 100,000 stocked.
    expect(r.survival).toEqual({ pct: 50, low: 45.5, high: 55.6, estimated: true });
  });

  it('hides survival when there is neither a count nor an ABW', async () => {
    const { service } = build({
      harvests: [fullHarvest({ pieces: null, averageSize: null, grades: [] })],
    });
    expect((await service.getCycleResult('crop-1', 'u')).survival).toBeNull();
  });

  it('yield is t/ha from the pond area, hidden when the area is unknown', async () => {
    const known = await build().service.getCycleResult('crop-1', 'u');
    expect(known.yield).toEqual({ tPerHa: 5, areaAssumed: false });

    const assumed = await build({ pond: { assumedFields: ['areaM2'] } }).service.getCycleResult('crop-1', 'u');
    expect(assumed.yield).toEqual({ tPerHa: 5, areaAssumed: true });

    const unknown = await build({ pond: { calculatedAreaM2: 0 } }).service.getCycleResult('crop-1', 'u');
    expect(unknown.yield).toBeNull();
  });

  it('money comes from getCycleFinancials; without VIEW_FINANCIALS it is null', async () => {
    const owner = await build().service.getCycleResult('crop-1', 'u');
    expect(owner.money).toEqual({
      revenue: 400000,
      cost: 300000,
      profit: 100000,
      marginPct: 25,
      breakEvenPricePerKg: 300,
    });

    const worker = await build({
      getCycleFinancials: jest.fn().mockRejectedValue(new ForbiddenException()),
    }).service.getCycleResult('crop-1', 'u');
    expect(worker.money).toBeNull();
    expect(worker.harvestedKg).toBe(1000); // the weights stay
  });

  it('does not swallow a non-permission failure as "no financials"', async () => {
    const { service } = build({
      getCycleFinancials: jest.fn().mockRejectedValue(new Error('db down')),
    });
    await expect(service.getCycleResult('crop-1', 'u')).rejects.toThrow('db down');
  });

  it('reads the crop member-aware at READ, not the VIEW_FINANCIALS read', async () => {
    const { service, cropsService } = build();
    await service.getCycleResult('crop-1', 'user-1');
    expect(cropsService.findOneAccessible).toHaveBeenCalledWith('crop-1', 'user-1');
    expect(cropsService.findOne).not.toHaveBeenCalled();
  });

  it('only SOLD harvests count', async () => {
    const { service } = build({
      harvests: [fullHarvest(), fullHarvest({ id: 'h2', status: 'discarded', weightKg: 500 })],
    });
    expect((await service.getCycleResult('crop-1', 'u')).harvestedKg).toBe(1000);
  });

  it('"Crop lost" comes from close_reason; an unmigrated column reads as no reason', async () => {
    const lost = await build({ sql: { close_reason: [{ closeReason: 'lost' }] } }).service.getCycleResult('crop-1', 'u');
    expect(lost.lost).toBe(true);

    const old = await build({ sql: { close_reason: missing('42703') } }).service.getCycleResult('crop-1', 'u');
    expect(old.closeReason).toBeNull();
    expect(old.lost).toBe(false);
  });

  describe('welfare: "not logged" is null, never 0', () => {
    it('no DO / NH3 readings → null; readings in range → 0 of N', async () => {
      const none = await build().service.getCycleResult('crop-1', 'u');
      expect(none.welfare.doBelow3Days).toBeNull();
      expect(none.welfare.nh3CriticalDays).toBeNull();

      const fine = await build({
        sql: {
          water_quality_records: [
            { day: '2026-07-01', do: 5, ph: 7.8, temp: 28, sal: 15, ammonia: 0.1 },
          ],
        },
      }).service.getCycleResult('crop-1', 'u');
      expect(fine.welfare.doBelow3Days).toEqual({ days: 0, of: 1 });
      expect(fine.welfare.nh3CriticalDays).toEqual({ days: 0, of: 1 });
    });

    it('counts DO < 3 days and critical free-NH3 days', async () => {
      const r = await build({
        sql: {
          water_quality_records: [
            { day: '2026-07-01', do: 2.5, ph: 8.5, temp: 30, sal: 0, ammonia: null },
            { day: '2026-07-01', do: 4.5, ph: null, temp: null, sal: null, ammonia: null },
            { day: '2026-07-02', do: 4, ph: 7.5, temp: 28, sal: 0, ammonia: 0.2 },
          ],
          // A chemistry TAN reading, paired with that day's WQ pH/temp:
          // 2 mg/L TAN at pH 8.5 / 30 °C ≈ 0.4 mg/L free NH3 → critical.
          chemical_data: [{ day: '2026-07-01', ammonia: 2 }],
        },
      }).service.getCycleResult('crop-1', 'u');
      expect(r.welfare.doBelow3Days).toEqual({ days: 1, of: 2 });
      expect(r.welfare.nh3CriticalDays).toEqual({ days: 1, of: 2 });
    });

    it('biosecurity and seed PCR (D5, parallel) are "not logged" until their schema exists', async () => {
      const r = await build({
        sql: { biosecurity_checks: missing('42P01'), pl_pcr_results: missing('42703') },
      }).service.getCycleResult('crop-1', 'u');
      expect(r.welfare.biosecurity).toBeNull();
      expect(r.welfare.seedPcr).toBeNull();

      const logged = await build({
        sql: {
          biosecurity_checks: [{ done: 5 }],
          pl_pcr_results: [{ results: { wssv: 'negative' }, date: '2026-05-30', spf: true }],
        },
      }).service.getCycleResult('crop-1', 'u');
      expect(logged.welfare.biosecurity).toEqual({ done: 5, total: 9 });
      expect(logged.welfare.seedPcr).toEqual({ results: { wssv: 'negative' }, date: '2026-05-30', spf: true });

      // Table exists but nothing ticked → still "not logged", not "0 of 9".
      const empty = await build({ sql: { biosecurity_checks: [{ done: 0 }] } }).service.getCycleResult('crop-1', 'u');
      expect(empty.welfare.biosecurity).toBeNull();
    });

    it('disease episodes carry outcomes; before D6 the outcome column is tolerated', async () => {
      const rows = [{ recordedDate: '2026-07-10', name: 'WSSV', outcome: 'recovered' }];
      const r = await build({ sql: { disease_records: rows } }).service.getCycleResult('crop-1', 'u');
      expect(r.welfare.diseases).toEqual(rows);

      const gone = await build({ sql: { disease_records: missing('42P01') } }).service.getCycleResult('crop-1', 'u');
      expect(gone.welfare.diseases).toBeNull();
    });
  });

  describe('Next cycle lines', () => {
    it('are absent when nothing applies', async () => {
      // FCR 1.2, survival 40% from counted pieces but no mortality spike logged.
      const r = await build({ harvests: [fullHarvest({ pieces: 40000 })] }).service.getCycleResult('crop-1', 'u');
      expect(r.nextCycle).toEqual([]);
    });

    it('poor FCR → the kg over an FCR of 1.3', async () => {
      const r = await build({
        sql: { feed_records: [{ tagged: 2000, untagged: 0, untaggedN: 0 }] },
      }).service.getCycleResult('crop-1', 'u');
      expect(r.fcrBand).toBe('poor');
      expect(r.nextCycle).toEqual([{ key: 'feedOver', params: { kg: 700 } }]);
    });
  });
});

describe('ReportsService.getCycleAnalysis — the same numbers as the Cycle Result', () => {
  it('keeps the VIEW_FINANCIALS gate and reads as (userId, cropId)', async () => {
    const { service, cropsService, samplingService, harvestsService } = build();
    await service.getCycleAnalysis('crop-1', 'user-1');
    expect(cropsService.findOne).toHaveBeenCalledWith('crop-1', 'user-1');
    expect(samplingService.findAll).toHaveBeenCalledWith('user-1', 'crop-1');
    expect(harvestsService.findAll).toHaveBeenCalledWith('user-1', 'crop-1');
  });

  it('survival is harvested ÷ stocked, not the sampling estimate (C2)', async () => {
    const { service } = build({
      samplings: [{ samplingDate: '2026-09-01', mbwG: 24, srEstimationPercent: 88 }],
    });
    const r = await service.getCycleAnalysis('crop-1', 'user-1');
    expect(r.survivalRate).toBe(40);
    expect(r.fcr).toBe(1.2);
    expect(r.totalHarvestKg).toBe(1000);
  });

  // DATE-1: a pre-05:30-IST sampling stays on its own IST calendar date.
  it('buckets the growth chart by IST day', async () => {
    const { service } = build({
      samplings: [{ samplingDate: '2026-06-16T20:30:00.000Z', mbwG: 12.5 }],
    });
    const r = await service.getCycleAnalysis('crop-1', 'user-1');
    expect(r.growthChart).toEqual([{ date: '2026-06-17', mbw: 12.5 }]);
  });
});

/**
 * The dashboard summary used to sit behind a 300s Redis TTL that nothing ever
 * invalidated, so a farmer who logged feed kept seeing the pre-log number for
 * up to five minutes. It reads through every time now — this pins that.
 */
describe('ReportsService.getDashboardSummary — always live', () => {
  const make = (feedUsage: jest.Mock, assertCanAccessFarm = jest.fn().mockResolvedValue({})) =>
    new ReportsService(
      {
        countActivePonds: jest.fn().mockResolvedValue(2),
        countTotalPonds: jest.fn().mockResolvedValue(3),
      } as any,
      { countLowStock: jest.fn().mockResolvedValue(0) } as any,
      { getDailyFeedUsage: feedUsage } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { assertCanAccessFarm } as any,
      {} as any,
      {} as any,
    );

  it('reflects feed logged between two reads', async () => {
    const feedUsage = jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(25);
    const service = make(feedUsage);
    expect((await service.getDashboardSummary('u1', 'f1')).todayFeedUsage).toBe(10);
    expect((await service.getDashboardSummary('u1', 'f1')).todayFeedUsage).toBe(25);
    expect(feedUsage).toHaveBeenCalledTimes(2);
  });

  it('still refuses a farm the caller cannot read', async () => {
    const service = make(jest.fn(), jest.fn().mockRejectedValue(new Error('forbidden')));
    await expect(service.getDashboardSummary('u1', 'f1')).rejects.toThrow('forbidden');
  });
});
