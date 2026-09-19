import { ForbiddenException } from '@nestjs/common';
import { FarmPriceQuotesController } from './farm-price-quotes.controller';

describe('FarmPriceQuotesController — prices are money (VIEW_FINANCIALS)', () => {
  const make = (allowed: boolean) => {
    const pricing = {
      currentQuote: jest.fn().mockResolvedValue({ quote: null }),
      createQuote: jest.fn().mockResolvedValue({ id: 'q' }),
    };
    const farmAccess = {
      assertCanAccessFarm: jest.fn(async () => {
        if (!allowed) throw new ForbiddenException();
      }),
    };
    const ctrl = new FarmPriceQuotesController(pricing as any, farmAccess as any);
    return { ctrl, pricing, farmAccess };
  };
  const user = { id: 'u-1' };
  const dto = { bands: [{ count: 40, price: 430 }] };

  it('reads and writes with VIEW_FINANCIALS', async () => {
    const { ctrl, pricing, farmAccess } = make(true);
    await ctrl.current('farm-1', user);
    await ctrl.create('farm-1', dto, user);
    expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('u-1', 'farm-1', 'VIEW_FINANCIALS');
    expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledTimes(2);
    expect(pricing.createQuote).toHaveBeenCalledWith('farm-1', dto, 'u-1');
  });

  it('refuses both without it, before touching the price book', async () => {
    const { ctrl, pricing } = make(false);
    await expect(ctrl.current('farm-1', user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctrl.create('farm-1', dto, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(pricing.currentQuote).not.toHaveBeenCalled();
    expect(pricing.createQuote).not.toHaveBeenCalled();
  });
});
