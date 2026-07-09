import { PricingService } from './pricing.service';

function makeService(repo: any) {
  return new PricingService(repo);
}

describe('PricingService', () => {
  const svc = makeService({});

  it('parses a price map into sorted bands', () => {
    const bands = svc.bandsFromPrices({ '40': 430, '30': 520, '50': 360 });
    expect(bands).toEqual([
      { count: 30, price: 520 },
      { count: 40, price: 430 },
      { count: 50, price: 360 },
    ]);
  });

  it('finds the nearest count band', () => {
    const bands = svc.bandsFromPrices({ '30': 520, '40': 430, '50': 360 });
    expect(svc.nearestBand(42, bands)?.price).toBe(430); // 42 → band 40
    expect(svc.nearestBand(48, bands)?.price).toBe(360); // 48 → band 50
    expect(svc.nearestBand(30, bands)?.price).toBe(520); // exact
    expect(svc.nearestBand(100, bands)?.count).toBe(50); // beyond range → nearest
  });

  it('resolves ₹/kg for an achieved count from the latest regional feed', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        region: 'AP-Nellore',
        prices: { '30': 520, '40': 430, '50': 360 },
      }),
    };
    const s = makeService(repo);
    await expect(s.priceForCount('AP-Nellore', 41)).resolves.toBe(430);
    expect(repo.findOne).toHaveBeenCalled();
  });

  it('returns null when no feed exists for the region', async () => {
    const s = makeService({ findOne: jest.fn().mockResolvedValue(null) });
    await expect(s.priceForCount('Nowhere', 40)).resolves.toBeNull();
  });
});
