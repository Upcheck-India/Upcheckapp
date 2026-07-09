import { ForbiddenException } from '@nestjs/common';
import { WaterQualityService } from './water-quality.service';

/**
 * IDOR-1: the idempotency guard must verify the caller can access the FOUND
 * record's pond before returning it, or a replayed create with a guessed id
 * leaks another tenant's water-quality record.
 */
const CLIENT_ID = '11111111-1111-4111-8111-111111111111';

describe('WaterQualityService — idempotency access guard (IDOR-1)', () => {
  let service: WaterQualityService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let pondsService: { findOneAccessible: jest.Mock; verifyAccess: jest.Mock };
  let alertsService: { createAutoAlert: jest.Mock };
  let farmAccess: { assertCanAccessPond: jest.Mock };

  beforeEach(() => {
    repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    pondsService = { findOneAccessible: jest.fn(), verifyAccess: jest.fn() };
    alertsService = { createAutoAlert: jest.fn() };
    farmAccess = { assertCanAccessPond: jest.fn() };
    service = new WaterQualityService(
      repo as any,
      pondsService as any,
      alertsService as any,
      farmAccess as any,
    );
  });

  it('returns the existing record when the caller may access its pond (allow)', async () => {
    const existing = { id: CLIENT_ID, pondId: 'pond-owned' };
    repo.findOne.mockResolvedValue(existing);
    farmAccess.assertCanAccessPond.mockResolvedValue({ id: 'pond-owned' });

    const result = await service.create(
      { id: CLIENT_ID, pondId: 'pond-owned' } as any,
      'user-1',
    );

    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith(
      'user-1',
      'pond-owned',
      'WRITE_OPERATIONAL',
    );
    expect(result).toBe(existing);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws (does not leak) when the found record belongs to another tenant (deny)', async () => {
    const existing = { id: CLIENT_ID, pondId: 'pond-of-another-farm' };
    repo.findOne.mockResolvedValue(existing);
    farmAccess.assertCanAccessPond.mockRejectedValue(new ForbiddenException());

    await expect(
      service.create(
        { id: CLIENT_ID, pondId: 'pond-of-another-farm' } as any,
        'attacker',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
