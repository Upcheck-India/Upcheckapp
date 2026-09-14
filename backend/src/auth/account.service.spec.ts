import { HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountService,
  CODE_COOLDOWN_SECONDS,
  CODE_MAX_ATTEMPTS,
  CODE_TTL_SECONDS,
} from './account.service';

const createClientMock = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

/** Asserts an HttpException with our machine code. */
async function expectCode(p: Promise<unknown>, code: string, status?: number) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(HttpException);
    const ex = e as HttpException;
    expect((ex.getResponse() as any).code).toBe(code);
    if (status) expect(ex.getStatus()).toBe(status);
    return;
  }
  throw new Error(`expected ${code}, but it resolved`);
}

let now = 1_000_000;

function fakeRedis() {
  const m = new Map<string, { v: string; exp: number }>();
  return {
    m,
    get: jest.fn(async (k: string) => {
      const e = m.get(k);
      if (!e) return null;
      if (e.exp <= now) {
        m.delete(k);
        return null;
      }
      return e.v;
    }),
    set: jest.fn(async (k: string, v: string, _mode?: string, s?: number) => {
      m.set(k, { v, exp: s ? now + s * 1000 : Infinity });
    }),
    del: jest.fn(async (k: string) => {
      m.delete(k);
    }),
  };
}

type Facts = {
  email: string | null;
  app_meta: Record<string, any>;
  has_pw: boolean;
};

function build(opts: {
  facts?: Partial<Facts>;
  emailOwners?: string[]; // emails owned by OTHER users
} = {}) {
  const facts: Facts = {
    email: 'farmer@example.com',
    app_meta: { provider: 'email', providers: ['email'] },
    has_pw: true,
    ...opts.facts,
  };
  const queries: [string, unknown[]][] = [];
  const dataSource = {
    query: jest.fn(async (sql: string, params: unknown[]) => {
      queries.push([sql, params]);
      if (sql.includes('FROM auth.users')) return [facts];
      if (sql.includes('FROM users WHERE lower(email)')) {
        return (opts.emailOwners ?? []).includes(params[0] as string)
          ? [{ id: 'someone-else' }]
          : [];
      }
      if (sql.includes('SELECT created_at')) {
        return [
          {
            created_at: '2026-01-02T03:04:05.000Z',
            phone: '917010133018',
            phone_verified: true,
          },
        ];
      }
      return [];
    }),
  };
  const admin = {
    updateUserById: jest.fn(async () => ({ data: { user: {} }, error: null })),
    getUserById: jest.fn(),
    signOut: jest.fn(async () => ({ data: null, error: null })),
  };
  const authService = {
    getClient: () => ({ auth: { admin } }),
    verifyPassword: jest.fn(async () => undefined),
  };
  const redis = fakeRedis();
  const sent: { to: string; code: string; purpose: string }[] = [];
  const emailService = {
    sendAccountCodeEmail: jest.fn(async (to: string, code: string, purpose: string) => {
      sent.push({ to, code, purpose });
    }),
  };
  const config = new ConfigService({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  const svc = new AccountService(
    config,
    authService as any,
    redis as any,
    emailService as any,
    dataSource as any,
  );
  return { svc, admin, authService, redis, sent, queries, dataSource, facts };
}

beforeEach(() => {
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  createClientMock.mockReset();
});
afterEach(() => jest.restoreAllMocks());

describe('hasPassword', () => {
  const f = (o: Partial<Facts>) => ({
    email: 'a@b.com',
    appMeta: {},
    hasEncryptedPassword: true,
    ...(o as any),
  });
  it('trusts the hash for ordinary email accounts', () => {
    expect(AccountService.hasPassword(f({}))).toBe(true);
    expect(AccountService.hasPassword(f({ hasEncryptedPassword: false } as any))).toBe(false);
  });
  it('is false for a Truecaller internal email despite its random hash', () => {
    expect(AccountService.hasPassword(f({ email: '9170@truecaller.temp' }))).toBe(false);
  });
  it('the server-side flag wins in both directions', () => {
    expect(
      AccountService.hasPassword(f({ appMeta: { upcheck_password_set: false } } as any)),
    ).toBe(false);
    expect(
      AccountService.hasPassword(
        f({ email: '9170@truecaller.temp', appMeta: { upcheck_password_set: true } } as any),
      ),
    ).toBe(true);
  });
});

describe('getAccountInfo (GET /profiles/me fields)', () => {
  it('returns createdAt, phone, phoneVerified, hasPassword, providers, emailIsInternal', async () => {
    const { svc } = build({
      facts: { app_meta: { provider: 'email', providers: ['email', 'google'] } },
    });
    await expect(svc.getAccountInfo('u1')).resolves.toEqual({
      createdAt: '2026-01-02T03:04:05.000Z',
      phone: '917010133018',
      phoneVerified: true,
      hasPassword: true,
      providers: ['email', 'google'],
      emailIsInternal: false,
    });
  });

  it('falls back to the admin API when auth.users is not readable', async () => {
    const { svc, dataSource, admin } = build();
    const base = dataSource.query.getMockImplementation()!;
    dataSource.query.mockImplementation(async (sql: string, p: unknown[]) => {
      if (sql.includes('auth.users')) throw new Error('permission denied');
      return base(sql, p);
    });
    admin.getUserById.mockResolvedValue({
      data: {
        user: {
          email: 'g@example.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          identities: [{ provider: 'google' }],
        },
      },
      error: null,
    });
    const info = await svc.getAccountInfo('u1');
    expect(info.hasPassword).toBe(false);
    expect(info.providers).toEqual(['google']);
  });
});

describe('updateName (PATCH /profiles/me)', () => {
  it('writes auth metadata (both spellings), users and profiles', async () => {
    const { svc, admin, queries } = build();
    await svc.updateName('u1', '  Aarav  Kumar Sharma ');
    expect(admin.updateUserById).toHaveBeenCalledWith('u1', {
      user_metadata: {
        full_name: 'Aarav  Kumar Sharma',
        first_name: 'Aarav',
        last_name: 'Kumar Sharma',
        firstName: 'Aarav',
        lastName: 'Kumar Sharma',
      },
    });
    expect(queries).toEqual(
      expect.arrayContaining([
        [expect.stringContaining('UPDATE users SET first_name'), ['Aarav', 'Kumar Sharma', 'u1']],
        [expect.stringContaining('UPDATE profiles SET full_name'), ['Aarav  Kumar Sharma', 'u1']],
      ]),
    );
  });

  it('writes nothing locally when Supabase refuses', async () => {
    const { svc, admin, queries } = build();
    admin.updateUserById.mockResolvedValueOnce({ data: null, error: { message: 'down' } } as any);
    await expect(svc.updateName('u1', 'A')).rejects.toBeDefined();
    expect(queries.some(([s]) => s.startsWith('UPDATE'))).toBe(false);
  });
});

describe('email codes', () => {
  const noPw = { facts: { has_pw: false, app_meta: { provider: 'google', providers: ['google'] } } };

  it('sends a 6-digit code to the account email for set_password', async () => {
    const { svc, sent } = build(noPw);
    await svc.requestEmailCode('u1', 'set_password');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('farmer@example.com');
    expect(sent[0].code).toMatch(/^\d{6}$/);
  });

  it('refuses set_password to an internal Truecaller address', async () => {
    const { svc } = build({ facts: { email: '917010133018@truecaller.temp' } });
    await expectCode(svc.requestEmailCode('u1', 'set_password'), 'NO_REAL_EMAIL', 400);
  });

  it('enforces the resend cooldown, then allows after it', async () => {
    const { svc, sent } = build(noPw);
    await svc.requestEmailCode('u1', 'set_password');
    await expectCode(svc.requestEmailCode('u1', 'set_password'), 'CODE_COOLDOWN', 429);
    now += CODE_COOLDOWN_SECONDS * 1000 + 1;
    await svc.requestEmailCode('u1', 'set_password');
    expect(sent).toHaveLength(2);
  });

  it('accepts the right code once', async () => {
    const { svc, sent } = build(noPw);
    await svc.requestEmailCode('u1', 'set_password');
    await svc.verifyCode('u1', 'set_password', 'farmer@example.com', sent[0].code);
    await expectCode(
      svc.verifyCode('u1', 'set_password', 'farmer@example.com', sent[0].code),
      'CODE_EXPIRED',
    );
  });

  it('expires after the TTL', async () => {
    const { svc, sent } = build(noPw);
    await svc.requestEmailCode('u1', 'set_password');
    now += CODE_TTL_SECONDS * 1000 + 1;
    await expectCode(
      svc.verifyCode('u1', 'set_password', 'farmer@example.com', sent[0].code),
      'CODE_EXPIRED',
    );
  });

  it(`burns the code on the ${CODE_MAX_ATTEMPTS}th wrong guess — even the right code then fails`, async () => {
    const { svc, sent } = build(noPw);
    await svc.requestEmailCode('u1', 'set_password');
    const wrong = sent[0].code === '000000' ? '111111' : '000000';
    for (let i = 1; i < 5; i++) {
      await expectCode(
        svc.verifyCode('u1', 'set_password', 'farmer@example.com', wrong),
        'CODE_INVALID',
      );
    }
    await expectCode(
      svc.verifyCode('u1', 'set_password', 'farmer@example.com', wrong),
      'TOO_MANY_ATTEMPTS',
    );
    await expectCode(
      svc.verifyCode('u1', 'set_password', 'farmer@example.com', sent[0].code),
      'CODE_EXPIRED',
    );
  });

  it('a code for one purpose does not work for the other', async () => {
    const { svc, sent } = build(noPw);
    await svc.requestEmailCode('u1', 'set_password');
    await expectCode(
      svc.verifyCode('u1', 'change_email', 'farmer@example.com', sent[0].code),
      'CODE_EXPIRED',
    );
  });

  it('a change_email code is bound to the address it was sent to', async () => {
    const { svc, sent } = build();
    await svc.requestEmailCode('u1', 'change_email', 'new@example.com');
    expect(sent[0].to).toBe('new@example.com');
    await expectCode(
      svc.verifyCode('u1', 'change_email', 'other@example.com', sent[0].code),
      'CODE_EXPIRED',
    );
  });

  it("rejects an email that belongs to another user", async () => {
    const { svc, sent } = build({ emailOwners: ['taken@example.com'] });
    await expectCode(
      svc.requestEmailCode('u1', 'change_email', 'taken@example.com'),
      'EMAIL_TAKEN',
      409,
    );
    expect(sent).toHaveLength(0);
  });

  it('clears the code and cooldown when the email cannot be sent', async () => {
    const { svc, redis } = build(noPw);
    (svc as any).emailService.sendAccountCodeEmail.mockRejectedValueOnce(new Error('brevo'));
    await expectCode(svc.requestEmailCode('u1', 'set_password'), 'EMAIL_SEND_FAILED', 503);
    expect(redis.m.size).toBe(0);
  });
});

describe('setPassword', () => {
  it('is refused when the account already has a password', async () => {
    const { svc, admin } = build();
    await expectCode(svc.setPassword('u1', '123456', 'Abcdef1#'), 'PASSWORD_ALREADY_SET', 409);
    expect(admin.updateUserById).not.toHaveBeenCalled();
  });

  it('is refused with a wrong code', async () => {
    const { svc, admin, sent } = build({ facts: { has_pw: false } });
    await svc.requestEmailCode('u1', 'set_password');
    const wrong = sent[0].code === '000000' ? '111111' : '000000';
    await expectCode(svc.setPassword('u1', wrong, 'Abcdef1#'), 'CODE_INVALID');
    expect(admin.updateUserById).not.toHaveBeenCalled();
  });

  it('sets the password and the server-side flag with the right code', async () => {
    const { svc, admin, sent } = build({ facts: { has_pw: false } });
    await svc.requestEmailCode('u1', 'set_password');
    await svc.setPassword('u1', sent[0].code, 'Abcdef1#');
    expect(admin.updateUserById).toHaveBeenCalledWith('u1', {
      password: 'Abcdef1#',
      app_metadata: { upcheck_password_set: true },
    });
  });
});

describe('changeEmail', () => {
  it('is refused for Google accounts', async () => {
    const { svc, admin } = build({
      facts: { has_pw: false, app_meta: { provider: 'google', providers: ['google'] } },
    });
    await expectCode(
      svc.changeEmail('u1', 'new@example.com', '123456'),
      'GOOGLE_EMAIL_LOCKED',
      400,
    );
    await expectCode(
      svc.requestEmailCode('u1', 'change_email', 'new@example.com'),
      'GOOGLE_EMAIL_LOCKED',
    );
    expect(admin.updateUserById).not.toHaveBeenCalled();
  });

  it('requires the current password when the account has one', async () => {
    const { svc } = build();
    await expectCode(
      svc.changeEmail('u1', 'new@example.com', '123456'),
      'CURRENT_PASSWORD_REQUIRED',
    );
  });

  it('maps a wrong current password to 400 (never 401) and keeps the code', async () => {
    const { svc, authService, sent } = build();
    await svc.requestEmailCode('u1', 'change_email', 'new@example.com');
    authService.verifyPassword.mockRejectedValueOnce(new UnauthorizedException());
    await expectCode(
      svc.changeEmail('u1', 'new@example.com', sent[0].code, 'bad'),
      'CURRENT_PASSWORD_INVALID',
      400,
    );
    // The code was not consumed by the failed password check.
    await expect(
      svc.changeEmail('u1', 'new@example.com', sent[0].code, 'good'),
    ).resolves.toEqual({ email: 'new@example.com' });
  });

  it('updates auth (confirmed) and profiles.email on success', async () => {
    const { svc, admin, queries, sent } = build();
    await svc.requestEmailCode('u1', 'change_email', 'new@example.com');
    await svc.changeEmail('u1', 'NEW@example.com', sent[0].code, 'pw');
    expect(admin.updateUserById).toHaveBeenCalledWith('u1', {
      email: 'new@example.com',
      email_confirm: true,
    });
    expect(queries).toContainEqual([
      expect.stringContaining('UPDATE profiles SET email'),
      ['new@example.com', 'u1'],
    ]);
  });

  it('leaving a Truecaller internal email records that no password is known', async () => {
    const { svc, admin, authService, sent } = build({
      facts: { email: '917010133018@truecaller.temp', has_pw: true },
    });
    await svc.requestEmailCode('u1', 'change_email', 'new@example.com');
    await svc.changeEmail('u1', 'new@example.com', sent[0].code);
    expect(authService.verifyPassword).not.toHaveBeenCalled();
    expect(admin.updateUserById).toHaveBeenCalledWith('u1', {
      email: 'new@example.com',
      email_confirm: true,
      app_metadata: { upcheck_password_set: false },
    });
  });
});

describe('linkGoogle', () => {
  const jwt = (sid: string) =>
    `h.${Buffer.from(JSON.stringify({ session_id: sid })).toString('base64url')}.s`;

  function withLinkResult(result: any) {
    const linkIdentity = jest.fn(async () => result);
    createClientMock.mockReturnValue({ auth: { linkIdentity } });
    return linkIdentity;
  }

  it("uses an isolated anon client carrying the caller's token", async () => {
    const { svc } = build();
    const linkIdentity = withLinkResult({ data: { session: null }, error: null });
    await svc.linkGoogle(jwt('caller'), 'google-id-token');
    const [url, key, opts] = createClientMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co');
    expect(key).toBe('anon');
    expect(opts.auth.persistSession).toBe(false);
    expect(opts.global.headers.Authorization).toBe(`Bearer ${jwt('caller')}`);
    expect(linkIdentity).toHaveBeenCalledWith({ provider: 'google', token: 'google-id-token' });
  });

  it('revokes only the NEW session GoTrue minted, locally', async () => {
    const { svc, admin } = build();
    withLinkResult({ data: { session: { access_token: jwt('new') } }, error: null });
    await expect(svc.linkGoogle(jwt('caller'), 't')).resolves.toEqual({ linked: true });
    expect(admin.signOut).toHaveBeenCalledWith(jwt('new'), 'local');
  });

  it("never revokes the caller's own session", async () => {
    const { svc, admin } = build();
    withLinkResult({ data: { session: { access_token: jwt('caller') } }, error: null });
    await svc.linkGoogle(jwt('caller'), 't');
    expect(admin.signOut).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: 'manual_linking_disabled', status: 404 }, 'MANUAL_LINKING_DISABLED', 400],
    [{ code: 'identity_already_exists', status: 422 }, 'GOOGLE_ALREADY_LINKED', 409],
    [{ code: 'bad_jwt', status: 403 }, 'SESSION_EXPIRED', 401],
    [{ code: 'validation_failed', status: 400 }, 'GOOGLE_LINK_FAILED', 400],
  ])('maps %o to %s', async (error, code, status) => {
    const { svc, admin } = build();
    withLinkResult({ data: { user: null, session: null }, error: { message: 'x', ...error } });
    await expectCode(svc.linkGoogle(jwt('caller'), 't'), code, status);
    expect(admin.signOut).not.toHaveBeenCalled();
  });
});
