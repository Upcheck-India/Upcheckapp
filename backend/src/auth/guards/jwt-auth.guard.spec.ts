import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    const reflector = new Reflector();
    guard = new JwtAuthGuard(reflector, {
      get: jest.fn().mockReturnValue('http://dummy.com'),
    } as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('AUTH-3: does not log the user email at log/warn on the auth hot path', async () => {
    const EMAIL = 'farmer.secret@example.com';
    (guard as any).supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'u1', email: EMAIL } },
          error: null,
        }),
      },
    };

    const logger = (guard as any).logger;
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});

    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/ping',
          headers: { authorization: 'Bearer tok' },
        }),
      }),
      getHandler: () => () => {},
      getClass: () => class {},
    };

    const ok = await guard.canActivate(ctx);
    expect(ok).toBe(true);

    const nonDebugArgs = [...logSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .join(' ');
    expect(nonDebugArgs).not.toContain(EMAIL);
    expect(nonDebugArgs).not.toContain('@');
    // Per-request "[AUTH OK]" spam is gone from log level.
    expect(nonDebugArgs).not.toContain('[AUTH OK]');
  });
});
