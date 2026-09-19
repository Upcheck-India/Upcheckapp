import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { IndiaController } from './india.controller';
import { PricingService } from './pricing.service';

/**
 * B8: any signed-in farmer could POST prices for any region, and those prices
 * feed Harvest Timing and P&L. Writing a feed is now staff-only.
 */
describe('POST /india/price-feeds (B8)', () => {
  const handler = IndiaController.prototype.createFeed;

  it('is gated by the admin key, not a farmer JWT', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata('__guards__', handler)).toContain(AdminKeyGuard);
  });

  it('rejects a farmer request that carries no admin key', () => {
    const guard = new AdminKeyGuard({ get: () => 'staff-secret' } as any);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/india/price-feeds',
          headers: { authorization: 'Bearer farmer-jwt' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('the public list never selects enteredBy', async () => {
    const repo = { find: jest.fn().mockResolvedValue([]) };
    await new PricingService(repo as any).findByRegion('AP-Nellore');
    const { select } = repo.find.mock.calls[0][0];
    expect(select).toBeDefined();
    expect(select.enteredBy).toBeUndefined();
  });
});
