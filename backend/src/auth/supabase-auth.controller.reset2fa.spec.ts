import { UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthController } from './supabase-auth.controller';

/**
 * AUTH-2 — password-reset flow must not bypass 2FA.
 *
 * The controller is instantiated directly with method-level mocks (no Nest
 * bootstrap needed) to prove the gate: a 2FA-enabled account gets a challenge
 * temp token instead of a session, and the withheld recovery session is only
 * released by POST /2fa/login after a code verifies. Non-2FA accounts pass
 * straight through.
 */
describe('SupabaseAuthController — reset-2fa-check (AUTH-2)', () => {
    let controller: SupabaseAuthController;
    let redisStore: Record<string, string>;

    const supabaseAuthService = { verifyAccessToken: jest.fn() };
    const twoFactorService = { isEnabled: jest.fn(), verifyCodeOrBackup: jest.fn() };
    const redisService = {
        get: jest.fn(async (k: string) => redisStore[k] ?? null),
        set: jest.fn(async (k: string, v: string) => {
            redisStore[k] = v;
        }),
        del: jest.fn(async (k: string) => {
            delete redisStore[k];
        }),
    };

    const recoveryUser = { id: 'user-1', email: 'farmer@example.com' };
    const body = { accessToken: 'recovery-access', refreshToken: 'recovery-refresh' };

    beforeEach(() => {
        jest.clearAllMocks();
        redisStore = {};
        controller = new SupabaseAuthController(
            supabaseAuthService as any,
            {} as any,
            twoFactorService as any,
            redisService as any,
        );
        supabaseAuthService.verifyAccessToken.mockResolvedValue(recoveryUser);
    });

    it('DENIES a 2FA account: withholds the session behind a temp token', async () => {
        twoFactorService.isEnabled.mockResolvedValue(true);

        const res = await controller.reset2faCheck(body);

        expect(res).toEqual({ requires2FA: true, tempToken: expect.any(String) });
        // The recovery session was stashed, NOT returned to the client.
        const stashed = JSON.parse(redisStore[`auth:2fa:temp:${(res as any).tempToken}`]);
        expect(stashed.userId).toBe('user-1');
        expect(stashed.session.access_token).toBe('recovery-access');
        expect(stashed.session.refresh_token).toBe('recovery-refresh');
    });

    it('a valid code at 2fa/login releases the withheld recovery session', async () => {
        twoFactorService.isEnabled.mockResolvedValue(true);
        const { tempToken } = (await controller.reset2faCheck(body)) as any;

        twoFactorService.verifyCodeOrBackup.mockResolvedValue(true);
        const login = await controller.twoFactorLogin({ tempToken, token: '123456' });

        expect(login.session.access_token).toBe('recovery-access');
        // Challenge consumed.
        expect(redisStore[`auth:2fa:temp:${tempToken}`]).toBeUndefined();
    });

    it('a wrong code at 2fa/login is rejected', async () => {
        twoFactorService.isEnabled.mockResolvedValue(true);
        const { tempToken } = (await controller.reset2faCheck(body)) as any;

        twoFactorService.verifyCodeOrBackup.mockResolvedValue(false);
        await expect(
            controller.twoFactorLogin({ tempToken, token: '000000' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('ALLOWS a non-2FA account through with no challenge', async () => {
        twoFactorService.isEnabled.mockResolvedValue(false);

        const res = await controller.reset2faCheck(body);

        expect(res).toEqual({ requires2FA: false });
        expect(redisService.set).not.toHaveBeenCalled();
    });
});
