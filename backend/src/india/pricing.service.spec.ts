import {
  PricingService,
  interpolatePrice,
  quoteStatus,
  bandsFromGrades,
  writeHarvestQuote,
  DEFAULT_QUOTE_COUNTS,
} from './pricing.service';

function makeService(repo: any) {
  return new PricingService(repo);
}

const BANDS = [
  { count: 30, price: 520 },
  { count: 40, price: 430 },
  { count: 50, price: 360 },
];

describe('PricingService', () => {
  const svc = makeService({});

  it('parses a price map into sorted bands', () => {
    const bands = svc.bandsFromPrices({ '40': 430, '30': 520, '50': 360 });
    expect(bands).toEqual(BANDS);
  });

  describe('priceForCount — linear interpolation (H5.2)', () => {
    it('interpolates between neighbouring bands', () => {
      // 42-count: 430 + 0.2 × (360 − 430) = 416. Nearest-band said 430.
      expect(svc.priceForCount(BANDS, 42)).toEqual({ price: 416, extrapolated: false });
      expect(svc.priceForCount(BANDS, 35)).toEqual({ price: 475, extrapolated: false });
    });

    it('returns the band price on an exact count', () => {
      expect(svc.priceForCount(BANDS, 30)).toEqual({ price: 520, extrapolated: false });
      expect(svc.priceForCount(BANDS, 50)).toEqual({ price: 360, extrapolated: false });
    });

    it('clamps outside the quoted range and flags it extrapolated', () => {
      expect(svc.priceForCount(BANDS, 25)).toEqual({ price: 520, extrapolated: true });
      expect(svc.priceForCount(BANDS, 100)).toEqual({ price: 360, extrapolated: true });
    });

    it('is order-independent and null without bands', () => {
      expect(interpolatePrice([...BANDS].reverse(), 45)?.price).toBe(395);
      expect(interpolatePrice([], 40)).toBeNull();
    });
  });

  describe('quote age', () => {
    const now = new Date('2026-09-19T06:00:00Z'); // 19 Sep IST
    it('is fresh up to 7 days, stale after, missing after 30', () => {
      expect(quoteStatus('2026-09-12', now)).toEqual({ ageDays: 7, status: 'fresh' });
      expect(quoteStatus('2026-09-10', now)).toEqual({ ageDays: 9, status: 'stale' });
      expect(quoteStatus('2026-08-20', now)).toEqual({ ageDays: 30, status: 'stale' });
      expect(quoteStatus('2026-08-19', now)).toEqual({ ageDays: 31, status: 'missing' });
      expect(quoteStatus(null, now)).toEqual({ ageDays: null, status: 'missing' });
    });

    it('does not offer a >30-day quote to the engines', async () => {
      const repo = {
        query: jest.fn().mockResolvedValue([
          { quotedOn: '2020-01-01', bands: BANDS },
        ]),
      };
      await expect(makeService(repo).usableBands('farm-1')).resolves.toBeUndefined();
      repo.query.mockResolvedValue([
        { quotedOn: new Date().toISOString().slice(0, 10), bands: BANDS },
      ]);
      await expect(makeService(repo).usableBands('farm-1')).resolves.toEqual(BANDS);
    });
  });

  describe('currentQuote', () => {
    it("defaults rows to the last quotes' counts", async () => {
      const repo = {
        query: jest.fn().mockResolvedValue([
          { quotedOn: '2026-09-18', bands: [{ count: 40, price: 430 }] },
          { quotedOn: '2026-09-01', bands: [{ count: 30, price: 500 }, { count: 40, price: 420 }] },
        ]),
      };
      const cur = await makeService(repo).currentQuote('farm-1', new Date('2026-09-19T06:00:00Z'));
      expect(cur.defaultCounts).toEqual([30, 40]);
      expect(cur.status).toBe('fresh');
      expect(cur.ageDays).toBe(1);
    });

    it('falls back to 30..100 with no history, and survives an unapplied migration', async () => {
      const repo = {
        query: jest.fn().mockRejectedValue({ code: '42P01' }),
      };
      const cur = await makeService(repo).currentQuote('farm-1');
      expect(cur).toEqual({
        quote: null,
        ageDays: null,
        status: 'missing',
        defaultCounts: DEFAULT_QUOTE_COUNTS,
      });
    });
  });

  describe('auto quote from a harvest (H5.1)', () => {
    it('keeps only priced, counted lines, one per count', () => {
      expect(
        bandsFromGrades([
          { countPerKg: 40, pricePerKg: 430 },
          { countPerKg: 30, pricePerKg: 520 },
          { countPerKg: 40, pricePerKg: 999 },
          { countPerKg: 60, pricePerKg: null },
          { countPerKg: 70, pricePerKg: 0 },
          { countPerKg: null, pricePerKg: 300 },
        ]),
      ).toEqual([
        { count: 30, price: 520 },
        { count: 40, price: 430 },
      ]);
    });

    it("writes a source='harvest' quote inside a savepoint", async () => {
      const manager = { query: jest.fn().mockResolvedValue([]) };
      await writeHarvestQuote(manager as any, {
        pondId: 'pond-1',
        harvestId: 'h-1',
        harvestDate: '2026-09-18T00:00:00Z',
        buyer: ' Ravi ',
        bands: [{ count: 40, price: 430 }],
        userId: 'u-1',
      });
      const sqls = manager.query.mock.calls.map((c) => c[0]);
      expect(sqls[0]).toBe('SAVEPOINT farm_price_quote');
      expect(sqls[1]).toContain("'harvest'");
      expect(manager.query.mock.calls[1][1]).toEqual([
        'pond-1',
        '2026-09-18',
        'Ravi',
        JSON.stringify([{ count: 40, price: 430 }]),
        'h-1',
        'u-1',
      ]);
      expect(sqls[2]).toBe('RELEASE SAVEPOINT farm_price_quote');
    });

    it('writes nothing without priced lines', async () => {
      const manager = { query: jest.fn() };
      await writeHarvestQuote(manager as any, {
        pondId: 'p', harvestId: 'h', harvestDate: '2026-09-18', bands: [], userId: 'u',
      });
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('never aborts the harvest when the table is not migrated yet', async () => {
      const manager = {
        query: jest.fn(async (sql: string) => {
          if (sql.startsWith('INSERT')) throw { code: '42P01' };
          return [];
        }),
      };
      await expect(
        writeHarvestQuote(manager as any, {
          pondId: 'p', harvestId: 'h', harvestDate: '2026-09-18',
          bands: [{ count: 40, price: 430 }], userId: 'u',
        }),
      ).resolves.toBeUndefined();
      expect(manager.query).toHaveBeenLastCalledWith('ROLLBACK TO SAVEPOINT farm_price_quote');
    });
  });

  it('resolves ₹/kg for a count from the latest regional feed', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        region: 'AP-Nellore',
        prices: { '30': 520, '40': 430, '50': 360 },
      }),
    };
    await expect(makeService(repo).priceForRegion('AP-Nellore', 42)).resolves.toBe(416);
  });

  it('returns null when no feed exists for the region', async () => {
    const s = makeService({ findOne: jest.fn().mockResolvedValue(null) });
    await expect(s.priceForRegion('Nowhere', 40)).resolves.toBeNull();
  });
});
