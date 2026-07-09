import { ForbiddenException } from '@nestjs/common';
import { OwnershipGuard } from './ownership.guard';

/**
 * OWN-1: when OwnershipGuard is applied but @OwnsResource is missing, the guard
 * must fail CLOSED (deny), not fail open.
 */
describe('OwnershipGuard — fail-closed on missing @OwnsResource (OWN-1)', () => {
  it('denies a guarded route that has no @OwnsResource decorator', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new OwnershipGuard(reflector as any, {} as any, {} as any);
    // Silence the intentional loud error log.
    jest.spyOn((guard as any).logger, 'error').mockImplementation(() => {});

    const ctx: any = {
      getHandler: () => function handler() {},
      getClass: () => class SomeController {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'u1' },
          params: {},
          body: {},
          query: {},
        }),
      }),
    };

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('proceeds past the decorator check when @OwnsResource IS present', async () => {
    // options present → guard moves on to resolve the resource id (missing here
    // → NotFoundException), proving it did NOT short-circuit as "misconfigured".
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        entityType: 'Crop',
        paramName: 'cropId',
        ownerPath: 'pond.farm.userId',
        capability: 'READ',
      }),
    };
    const guard = new OwnershipGuard(reflector as any, {} as any, {} as any);
    const ctx: any = {
      getHandler: () => function handler() {},
      getClass: () => class SomeController {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'u1' },
          params: {},
          body: {},
          query: {},
        }),
      }),
    };
    // resourceId missing → NotFoundException (not the ForbiddenException from the fail-closed branch).
    await expect(guard.canActivate(ctx)).rejects.toThrow(/missing in request/);
  });
});
