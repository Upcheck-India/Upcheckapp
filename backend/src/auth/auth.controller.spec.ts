import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const mockAuthService = {
  googleAuth: jest.fn(),
  linkGoogleAccount: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  requestOtpLogin: jest.fn(),
  verifyOtpLogin: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  logoutAllDevices: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  setup2FA: jest.fn(),
  setupTwoFactor: jest.fn(),
  enableTwoFactor: jest.fn(),
  verifyTwoFactorLogin: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  getSessions: jest.fn(),
  revokeSession: jest.fn(),
  deleteAccount: jest.fn(),
  resendVerification: jest.fn(),
  verifyEmail: jest.fn(),
};

const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) };

const mockReq = (overrides: any = {}) => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'test-agent' },
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

  describe('googleAuth', () => {
    it('should call authService.googleAuth with ip/userAgent', async () => {
      const dto = { idToken: 'google-token' };
      const authResult = {
        message: 'Google authentication successful',
        user: { id: 'u1' },
        accessToken: 'at',
        refreshToken: 'rt',
      };
      mockAuthService.googleAuth.mockResolvedValue(authResult);

      const req = mockReq();
      const result = await controller.googleAuth(dto, req as any);

      expect(mockAuthService.googleAuth).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
      expect(result).toEqual(authResult);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken with dto and request info', async () => {
      const dto = { refreshToken: 'old-rt' };
      const req = mockReq();
      const authResult = { accessToken: 'new-at', refreshToken: 'new-rt' };

      mockAuthService.refreshToken.mockResolvedValue(authResult);

      const result = await controller.refreshToken(dto, req as any);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
      expect(result).toEqual(authResult);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with userId and refreshToken', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });

      const result = await controller.logout('user-id', 'rt');

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-id', 'rt');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getProfile', () => {
    it('should call authService.getProfile', async () => {
      const profile = { id: 'u1', email: 'test@test.com' };
      mockAuthService.getProfile.mockResolvedValue(profile);

      const result = await controller.getProfile('u1');

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('u1');
      expect(result).toEqual(profile);
    });
  });
});
