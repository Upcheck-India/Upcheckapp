import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TwoFactorService } from './two-factor.service';
import { User } from './user.entity';
import { RedisService } from '../redis/redis.service';

/**
 * Live-incident regression test: on 2026-07-12, every login (password, OTP,
 * Google, Truecaller) started 500ing with "column User.backup_codes does not
 * exist" — the AddBackupCodesColumn migration existed in code but was never
 * applied to production. `isEnabled()` runs on the shared post-login gate for
 * EVERY auth method, so one missing column took down all of authentication.
 *
 * This locks in the fix: a DB query failure here must degrade to "2FA not
 * required" rather than propagate and crash the login that depends on it.
 * The real fix is keeping migrations applied — this is the safety net for
 * exactly this class of schema-drift incident recurring.
 */
describe('TwoFactorService.isEnabled — fails safe on a DB query error', () => {
  let service: TwoFactorService;
  let repo: { findOneBy: jest.Mock };

  beforeEach(async () => {
    repo = { findOneBy: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();
    service = module.get(TwoFactorService);
  });

  it('returns true when the user genuinely has 2FA enabled (unchanged behavior)', async () => {
    repo.findOneBy.mockResolvedValue({ id: 'u1', is2faEnabled: true });
    await expect(service.isEnabled('u1')).resolves.toBe(true);
  });

  it('returns false when the user does not have 2FA enabled (unchanged behavior)', async () => {
    repo.findOneBy.mockResolvedValue({ id: 'u1', is2faEnabled: false });
    await expect(service.isEnabled('u1')).resolves.toBe(false);
  });

  it('returns false (does not throw) when the user row does not exist', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.isEnabled('missing-user')).resolves.toBe(false);
  });

  it('returns false (does not throw) on a raw DB error — e.g. a missing column from an unapplied migration', async () => {
    repo.findOneBy.mockRejectedValue(
      Object.assign(new Error('column User.backup_codes does not exist'), {
        code: '42703',
      }),
    );
    await expect(service.isEnabled('u1')).resolves.toBe(false);
  });

  it('returns false (does not throw) on any other unexpected query failure', async () => {
    repo.findOneBy.mockRejectedValue(new Error('connection terminated unexpectedly'));
    await expect(service.isEnabled('u1')).resolves.toBe(false);
  });
});
