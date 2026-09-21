import { randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import { TwoFactorService } from './two-factor.service';
import { openTotpSecret, sealTotpSecret } from './totp-secret-cipher';
import { User } from './user.entity';

/**
 * C5.3 — TOTP secrets encrypted at rest (AES-256-GCM, `enc:v1:`), against the
 * real otplib + crypto; only the repository and Redis are faked.
 */
const KEY_A = randomBytes(32).toString('base64');
const KEY_B = randomBytes(32).toString('base64');

function setKeys(current?: string, previous?: string) {
  if (current === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
  else process.env.TOTP_ENCRYPTION_KEY = current;
  if (previous === undefined) delete process.env.TOTP_ENCRYPTION_KEY_PREVIOUS;
  else process.env.TOTP_ENCRYPTION_KEY_PREVIOUS = previous;
}

describe('TwoFactorService — TOTP secret at rest (C5.3)', () => {
  let users: Record<string, User>;
  let redisStore: Record<string, string>;
  let service: TwoFactorService;
  let logError: jest.SpyInstance;

  const repo = {
    findOneBy: jest.fn(async ({ id }: { id: string }) => users[id] ?? null),
    save: jest.fn(async (u: User) => u),
    // Mirrors the compare-and-swap checkTotp issues.
    update: jest.fn(async (where: any, patch: any) => {
      const u = users[where.id];
      if (u && u.totpSecret === where.totpSecret) Object.assign(u, patch);
    }),
    manager: {
      transaction: jest.fn(async (cb: (m: any) => Promise<boolean>) =>
        cb({ findOne: jest.fn(async () => null), save: jest.fn() }),
      ),
    },
  };
  const redis = {
    get: jest.fn(async (k: string) => redisStore[k] ?? null),
    set: jest.fn(async (k: string, v: string) => {
      redisStore[k] = v;
    }),
    del: jest.fn(async (k: string) => {
      delete redisStore[k];
    }),
  };

  const addUser = (id: string, totpSecret: string | null, enabled = true) => {
    users[id] = { id, email: `${id}@x.test`, is2faEnabled: enabled, totpSecret, backupCodes: [] } as unknown as User;
    return users[id];
  };
  const build = () => {
    service = new TwoFactorService(repo as any, redis as any);
    logError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    users = {};
    redisStore = {};
    setKeys(KEY_A);
    build();
  });
  afterAll(() => setKeys());

  it('enable() stores ciphertext, not the secret, and it still verifies', async () => {
    const u = addUser('u1', null, false);
    const secret = authenticator.generateSecret();
    redisStore['2fa:pending:u1'] = secret;
    await service.enable('u1', authenticator.generate(secret));

    expect(u.totpSecret).toMatch(/^enc:v1:[^:]+:[^:]+:[^:]+$/);
    expect(u.totpSecret).not.toContain(secret);
    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(true);
    expect(await service.verifyCodeOrBackup('u1', authenticator.generate(secret))).toBe(true);
  });

  it('two seals of the same secret differ (random IV)', () => {
    expect(sealTotpSecret('JBSWY3DPEHPK3PXP')).not.toBe(sealTotpSecret('JBSWY3DPEHPK3PXP'));
  });

  it('a legacy plaintext row still verifies, then is re-encrypted in place', async () => {
    const secret = authenticator.generateSecret();
    const u = addUser('u1', secret);

    expect(await service.verifyCodeOrBackup('u1', authenticator.generate(secret))).toBe(true);
    expect(repo.update).toHaveBeenCalledWith({ id: 'u1', totpSecret: secret }, { totpSecret: expect.stringMatching(/^enc:v1:/) });
    expect(u.totpSecret).toMatch(/^enc:v1:/);
    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(true);
  });

  it('a plaintext row with a WRONG code is not rewritten', async () => {
    const secret = authenticator.generateSecret();
    const u = addUser('u1', secret);
    expect(await service.verifyCode('u1', '000000')).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
    expect(u.totpSecret).toBe(secret);
  });

  it('no key set: behaves exactly as before (plaintext stored, verifies, never rewritten)', async () => {
    setKeys();
    build();
    const u = addUser('u1', null, false);
    const secret = authenticator.generateSecret();
    redisStore['2fa:pending:u1'] = secret;
    await service.enable('u1', authenticator.generate(secret));

    expect(u.totpSecret).toBe(secret);
    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(true);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('warns at startup only when the key is missing or malformed', () => {
    const warn = (service as any).logger.warn as jest.Mock;
    service.onModuleInit();
    expect(warn).not.toHaveBeenCalled();
    setKeys();
    service.onModuleInit();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not set'));
  });

  it('a malformed key is ignored (plaintext), not a crash', async () => {
    setKeys(Buffer.from('too short').toString('base64'));
    build();
    expect(sealTotpSecret('JBSWY3DPEHPK3PXP')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('an encrypted row with the key missing fails closed for that user, loudly', async () => {
    const secret = authenticator.generateSecret();
    addUser('u1', sealTotpSecret(secret));
    setKeys();
    build();

    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(false);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('could not be decrypted'));
  });

  it('an encrypted row with the wrong key fails closed', async () => {
    const secret = authenticator.generateSecret();
    addUser('u1', sealTotpSecret(secret));
    setKeys(KEY_B);
    build();
    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(false);
  });

  it('rotation: PREVIOUS opens the old row, which is re-sealed under the new key', async () => {
    const secret = authenticator.generateSecret();
    const u = addUser('u1', sealTotpSecret(secret)); // under KEY_A
    const underA = u.totpSecret;

    setKeys(KEY_B, KEY_A);
    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(true);
    expect(u.totpSecret).not.toBe(underA);

    setKeys(KEY_B); // PREVIOUS retired
    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(true);
    expect(openTotpSecret(u.totpSecret!)).toEqual({ secret, stale: false });
  });

  it('a tampered auth tag fails closed for that user only', async () => {
    const secret = authenticator.generateSecret();
    const [iv, tag, ct] = sealTotpSecret(secret).slice('enc:v1:'.length).split(':');
    const badTag = Buffer.from(tag, 'base64');
    badTag[0] ^= 1;
    addUser('victim', `enc:v1:${iv}:${badTag.toString('base64')}:${ct}`);
    const other = authenticator.generateSecret();
    addUser('other', sealTotpSecret(other));

    expect(await service.verifyCode('victim', authenticator.generate(secret))).toBe(false);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('victim'));
    expect(await service.verifyCode('other', authenticator.generate(other))).toBe(true);
  });

  it('a tampered ciphertext fails closed', () => {
    const [iv, tag, ct] = sealTotpSecret('JBSWY3DPEHPK3PXP').slice('enc:v1:'.length).split(':');
    const badCt = Buffer.from(ct, 'base64');
    badCt[0] ^= 1;
    expect(openTotpSecret(`enc:v1:${iv}:${tag}:${badCt.toString('base64')}`).secret).toBeNull();
  });

  it('disable() and regenerate work on an encrypted secret', async () => {
    const secret = authenticator.generateSecret();
    const u = addUser('u1', sealTotpSecret(secret));
    const { backupCodes } = await service.regenerateBackupCodes('u1', authenticator.generate(secret));
    expect(backupCodes).toHaveLength(10);
    await service.disable('u1', authenticator.generate(secret));
    expect(u.is2faEnabled).toBe(false);
    expect(u.totpSecret).toBeNull();
  }, 30_000);
});
