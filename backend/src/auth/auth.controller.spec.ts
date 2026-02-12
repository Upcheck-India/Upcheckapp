import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

const mockAuthService = {
  googleLogin: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
};

const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) };

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
    it('should call authService.googleLogin and set cookie', async () => {
      const dto = { token: 'google-token' };
      const authResult = {
        user: { id: 'u1' },
        access_token: 'at',
        refresh_token: 'rt'
      };
      mockAuthService.googleLogin.mockResolvedValue(authResult);

      const res = { cookie: jest.fn() } as any;

      const result = await controller.googleLogin(dto, res);

      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'rt', expect.any(Object));
      expect(result).toEqual({ user: authResult.user, access_token: authResult.access_token });
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken and update cookie', async () => {
      const req = { cookies: { refresh_token: 'old-rt' } } as any;
      const res = { cookie: jest.fn() } as any;
      const authResult = { access_token: 'new-at', refresh_token: 'new-rt' };

      mockAuthService.refreshToken.mockResolvedValue(authResult);

      const result = await controller.refreshToken(req, res);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-rt');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'new-rt', expect.any(Object));
      expect(result).toEqual({ access_token: 'new-at' });
    });

    it('should throw UnauthorizedException if cookie missing', async () => {
      const req = { cookies: {} } as any;
      const res = { cookie: jest.fn() } as any;

      await expect(controller.refreshToken(req, res)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and clear cookie', async () => {
      const req = { cookies: { refresh_token: 'rt' } } as any;
      const res = { clearCookie: jest.fn() } as any;

      const result = await controller.logout(req, res);

      expect(mockAuthService.logout).toHaveBeenCalledWith('rt');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('health', () => {
    it('should return status ok', () => {
      const result = controller.health();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('getMe', () => {
    it('should return user from request', () => {
      const user = { id: 'u1' };
      const result = controller.getMe(user);
      expect(result).toEqual(user);
    });
  });
});
