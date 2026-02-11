import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  loginWithOtp: jest.fn(),
  refreshToken: jest.fn(),
  getUser: jest.fn(),
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

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = { email: 'a@b.com', password: 'pass123' };
      mockAuthService.register.mockResolvedValue({ message: 'ok', user: {} });
      const result = await controller.register(dto);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result.message).toBe('ok');
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto = { email: 'a@b.com', password: 'pass123' };
      mockAuthService.login.mockResolvedValue({ access_token: 'tok' });
      const result = await controller.login(dto);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result.access_token).toBe('tok');
    });
  });

  describe('sendOtp', () => {
    it('should call authService.sendOtp', async () => {
      const dto = { email: 'a@b.com' };
      mockAuthService.sendOtp.mockResolvedValue({ message: 'OTP sent successfully.' });
      const result = await controller.sendOtp(dto);
      expect(mockAuthService.sendOtp).toHaveBeenCalledWith(dto);
      expect(result.message).toBe('OTP sent successfully.');
    });
  });

  describe('verifyOtp', () => {
    it('should call authService.verifyOtp', async () => {
      const dto = { email: 'a@b.com', token: '123456' };
      mockAuthService.verifyOtp.mockResolvedValue({ verified: true });
      const result = await controller.verifyOtp(dto);
      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(dto);
      expect(result.verified).toBe(true);
    });
  });

  describe('health', () => {
    it('should return status ok', () => {
      const result = controller.health();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken', async () => {
      mockAuthService.refreshToken.mockResolvedValue({ access_token: 'new-tok' });
      const result = await controller.refreshToken('old-refresh');
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-refresh');
      expect(result.access_token).toBe('new-tok');
    });
  });

  describe('logout', () => {
    it('should call authService.logout with extracted token', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });
      const result = await controller.logout('Bearer my-token');
      expect(mockAuthService.logout).toHaveBeenCalledWith('my-token');
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
