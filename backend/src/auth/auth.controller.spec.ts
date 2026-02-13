import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

const mockAuthService = {
  googleLogin: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  logoutAllDevices: jest.fn(),
  getUser: jest.fn(),
  setup2FA: jest.fn(),
  enable2FA: jest.fn(),
  disable2FA: jest.fn(),
  regenerateBackupCodes: jest.fn(),
  loginWith2FA: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  getSessions: jest.fn(),
  revokeSession: jest.fn(),
  deleteAccount: jest.fn(),
  resendVerificationEmail: jest.fn(),
};

const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) };

const mockReq = (overrides: any = {}) => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'test-agent' },
  cookies: {},
  ...overrides,
});

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('googleLogin', () => {
    it('should call authService.googleLogin with ip/userAgent and set cookie', async () => {
      const dto = { token: 'google-token' };
      const authResult = {
        user: { id: 'u1' },
        access_token: 'at',
        refresh_token: 'rt',
      };
      mockAuthService.googleLogin.mockResolvedValue(authResult);

      const req = mockReq();
      const res = { cookie: jest.fn() } as any;

      const result = await controller.googleLogin(dto, req as any, res);

      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'rt', expect.any(Object));
      expect(result.access_token).toBe('at');
    });

    it('should return temp_token when 2FA required', async () => {
      const dto = { token: 'google-token' };
      mockAuthService.googleLogin.mockResolvedValue({ requires2fa: true, temp_token: 'tmp' });

      const req = mockReq();
      const res = { cookie: jest.fn() } as any;

      const result = await controller.googleLogin(dto, req as any, res);

      expect((result as any).requires2fa).toBe(true);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken and update cookie', async () => {
      const req = mockReq({ cookies: { refresh_token: 'old-rt' } });
      const res = { cookie: jest.fn() } as any;
      const authResult = { access_token: 'new-at', refresh_token: 'new-rt' };

      mockAuthService.refreshToken.mockResolvedValue(authResult);

      const result = await controller.refreshToken(req as any, {}, res);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-rt', '127.0.0.1', 'test-agent');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'new-rt', expect.any(Object));
      expect(result).toEqual({ access_token: 'new-at', refresh_token: 'new-rt' });
    });

    it('should throw UnauthorizedException if no refresh token', async () => {
      const req = mockReq({ cookies: {} });
      const res = { cookie: jest.fn() } as any;

      await expect(controller.refreshToken(req as any, {}, res)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and clear cookie', async () => {
      const req = mockReq({ cookies: { refresh_token: 'rt' } });
      const res = { clearCookie: jest.fn() } as any;

      const result = await controller.logout(req as any, {}, res);

      expect(mockAuthService.logout).toHaveBeenCalledWith('rt');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('health', () => {
    it('should return status ok with timestamp', () => {
      const result = controller.health();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getMe', () => {
    it('should call authService.getUser', async () => {
      const user = { id: 'u1' };
      mockAuthService.getUser.mockResolvedValue({ id: 'u1', email: 'test@test.com' });

      const result = await controller.getMe(user);

      expect(mockAuthService.getUser).toHaveBeenCalledWith('u1');
    });
  });
});
