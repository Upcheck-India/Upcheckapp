import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { HarvestTimingController } from './harvest-timing.controller';
import { HarvestTimingService } from './harvest-timing.service';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';

const BANDS = [
  { count: 40, price: 430 },
  { count: 50, price: 360 },
];

function make(opts: { financials?: boolean; management?: boolean; bands?: any } = {}) {
  const pondsService = {
    findOneAccessible: jest.fn(async (_id: string, _u: string, cap: string) => {
      if (cap === 'VIEW_FINANCIALS' && opts.financials === false) {
        throw new ForbiddenException();
      }
      return { id: 'pond-1', farmId: 'farm-1' };
    }),
    verifyAccess: jest.fn(async () => {
      if (opts.management === false) throw new ForbiddenException();
    }),
  };
  const pricing = {
    usableBands: jest.fn().mockResolvedValue('bands' in opts ? opts.bands : BANDS),
    latestForRegion: jest.fn().mockResolvedValue(null),
  };
  const repo = {
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ ...v, id: 'rec-1' })),
  };
  const ctrl = new HarvestTimingController(
    new HarvestTimingService(new ShrimpCalculationsService()),
    pricing as any,
    pondsService as any,
    repo as any,
  );
  return { ctrl, pondsService, pricing, repo };
}

const body = {
  abwNow: 20,
  adgNow: 0.3,
  nNow: 50_000,
  areaM2: 4000,
  feedPricePerKg: 60,
  pondId: '11111111-1111-4111-8111-111111111111',
  cropId: '22222222-2222-4222-8222-222222222222',
  persist: true,
};
const user = { id: 'u-1' };

describe('HarvestTimingController.optimize — a pond answer is money (B6/H6)', () => {
  it("asks for VIEW_FINANCIALS on the pond and prices from the farm's quote", async () => {
    const { ctrl, pondsService, pricing, repo } = make();
    const r: any = await ctrl.optimize(body as any, user);
    expect(pondsService.findOneAccessible).toHaveBeenCalledWith(body.pondId, 'u-1', 'VIEW_FINANCIALS');
    expect(pricing.usableBands).toHaveBeenCalledWith('farm-1');
    expect(r.projections[0].pricePerKg).toBe(360); // 50-count
    // persist → harvest_recommendations records what was advised.
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pondId: body.pondId, cropId: body.cropId }),
    );
    expect(r.id).toBe('rec-1');
  });

  it('refuses without VIEW_FINANCIALS, before computing anything', async () => {
    const { ctrl, pricing, repo } = make({ financials: false });
    await expect(ctrl.optimize(body as any, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(pricing.usableBands).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('no usable quote (none, or >30 days) → 400 NO_PRICE_QUOTE', async () => {
    const { ctrl } = make({ bands: undefined });
    await expect(ctrl.optimize(body as any, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('without WRITE_MANAGEMENT the advice is returned but not stored', async () => {
    const { ctrl, repo } = make({ management: false });
    const r: any = await ctrl.optimize(body as any, user);
    expect(r.projections.length).toBeGreaterThan(0);
    expect(r.id).toBeUndefined();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('a pure preview (no pondId, explicit bands) needs no pond access', async () => {
    const { ctrl, pondsService } = make();
    const { pondId, persist, ...preview } = body;
    await ctrl.optimize({ ...preview, priceBands: BANDS } as any, user);
    expect(pondsService.findOneAccessible).not.toHaveBeenCalled();
  });
});
