import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { AdminKeyGuard, ADMIN_KEY_HEADER } from './admin-key.guard';

const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

const contextWith = (headers: Record<string, unknown>): { ctx: ExecutionContext; req: any } => {
  const req: any = { headers, method: 'GET', url: '/api/admin/feedback' };
  return {
    req,
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext,
  };
};

const guardWith = (opts: { apiKey?: string; staffKeys?: string }) =>
  new AdminKeyGuard({
    get: (key: string) => (key === 'ADMIN_API_KEY' ? opts.apiKey : opts.staffKeys),
  } as unknown as ConfigService);

describe('AdminKeyGuard — shared-key mode (ADMIN_STAFF_KEYS unset)', () => {
  it('lets the dashboard through with the right key, logged as "shared-key"', () => {
    const guard = guardWith({ apiKey: 's3cret-key' });
    const { ctx, req } = contextWith({ [ADMIN_KEY_HEADER]: 's3cret-key' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.adminStaff).toBe('shared-key');
  });

  it('rejects a wrong key', () => {
    const guard = guardWith({ apiKey: 's3cret-key' });
    const { ctx } = contextWith({ [ADMIN_KEY_HEADER]: 'wrong-key-xx' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a key of a different length', () => {
    // timingSafeEqual throws on mismatched lengths — the guard must handle
    // that itself rather than 500ing on a short header.
    const guard = guardWith({ apiKey: 's3cret-key' });
    const { ctx } = contextWith({ [ADMIN_KEY_HEADER]: 'x' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a missing header', () => {
    const guard = guardWith({ apiKey: 's3cret-key' });
    const { ctx } = contextWith({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a farmer bearer token — this is not that kind of auth', () => {
    const guard = guardWith({ apiKey: 's3cret-key' });
    const { ctx } = contextWith({ authorization: 'Bearer farmer-jwt' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  /**
   * The one that matters: a forgotten Render env var must not open the support
   * inbox — with farmers' photos in it — to the internet.
   */
  it('denies everything when neither ADMIN_STAFF_KEYS nor ADMIN_API_KEY is configured', () => {
    const guard = guardWith({});
    const { ctx } = contextWith({ [ADMIN_KEY_HEADER]: 'anything' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});

describe('AdminKeyGuard — per-staff mode (ADMIN_STAFF_KEYS set)', () => {
  const staffKeys = JSON.stringify({
    robin: sha256Hex('robins-key'),
    asha: sha256Hex('ashas-key'),
  });

  it('resolves a presented key to its staff name and attaches it to the request', () => {
    const guard = guardWith({ staffKeys });
    const { ctx, req } = contextWith({ [ADMIN_KEY_HEADER]: 'robins-key' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.adminStaff).toBe('robin');
  });

  it('resolves a different staff member to their own name', () => {
    const guard = guardWith({ staffKeys });
    const { ctx, req } = contextWith({ [ADMIN_KEY_HEADER]: 'ashas-key' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.adminStaff).toBe('asha');
  });

  it('rejects an unknown key', () => {
    const guard = guardWith({ staffKeys });
    const { ctx } = contextWith({ [ADMIN_KEY_HEADER]: 'not-a-real-key' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  /**
   * The transition rule: once ADMIN_STAFF_KEYS is set, the old shared key
   * must stop working, even though it's still sitting in ADMIN_API_KEY.
   * Mutation-check: delete the `staffNames.length > 0` branch guard and this
   * is the test that catches it — the shared key would start authenticating
   * again as an unnamed "identity".
   */
  it('refuses the old shared ADMIN_API_KEY once ADMIN_STAFF_KEYS is configured', () => {
    const guard = guardWith({ apiKey: 'the-old-shared-key', staffKeys });
    const { ctx } = contextWith({ [ADMIN_KEY_HEADER]: 'the-old-shared-key' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a missing header', () => {
    const guard = guardWith({ staffKeys });
    const { ctx } = contextWith({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});

describe('AdminKeyGuard — malformed ADMIN_STAFF_KEYS', () => {
  it('falls back to shared-key mode when ADMIN_STAFF_KEYS is not valid JSON', () => {
    const guard = guardWith({ apiKey: 's3cret-key', staffKeys: 'not json' });
    const { ctx, req } = contextWith({ [ADMIN_KEY_HEADER]: 's3cret-key' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.adminStaff).toBe('shared-key');
  });
});
