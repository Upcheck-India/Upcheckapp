import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpCode } from './otp-code.entity';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { MailService } from './mail.service';

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const configMap: Record<string, string> = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
    };
    return configMap[key] || '';
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let mockOtpRepository: Record<string, jest.Mock>;
  let mockRateLimitService: Record<string, jest.Mock>;
  let mockMailService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockOtpRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'otp-1', failedAttempts: 0 })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockRateLimitService = {
      checkDailyLimit: jest.fn().mockResolvedValue(true),
      checkResendCooldown: jest.fn().mockResolvedValue(true),
    };

    mockMailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
      verifyConnection: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(OtpCode), useValue: mockOtpRepository },
        { provide: OtpRateLimitService, useValue: mockRateLimitService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- sendOtp ---

  describe('sendOtp', () => {
    it('should throw BadRequestException when neither email nor phone provided', async () => {
      await expect(service.sendOtp({} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when daily limit exceeded', async () => {
      mockRateLimitService.checkDailyLimit.mockResolvedValue(false);
      await expect(service.sendOtp({ email: 'a@b.com' })).rejects.toThrow('Daily OTP limit exceeded');
    });

    it('should throw BadRequestException when resend cooldown active', async () => {
      mockRateLimitService.checkResendCooldown.mockResolvedValue(false);
      await expect(service.sendOtp({ email: 'a@b.com' })).rejects.toThrow('Please wait before requesting another OTP');
    });

    it('should send OTP email and save record on success', async () => {
      const result = await service.sendOtp({ email: 'user@example.com' });

      expect(mockMailService.sendOtpEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendOtpEmail.mock.calls[0][0]).toBe('user@example.com');
      // OTP should be a 6-digit string
      const otp = mockMailService.sendOtpEmail.mock.calls[0][1];
      expect(otp).toMatch(/^\d{6}$/);

      expect(mockOtpRepository.create).toHaveBeenCalledTimes(1);
      expect(mockOtpRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'OTP sent successfully.' });
    });

    it('should throw BadRequestException for phone OTP (not yet supported)', async () => {
      await expect(service.sendOtp({ phone: '+919876543210' })).rejects.toThrow('SMS OTP is not yet supported');
    });

    it('should check rate limits before sending', async () => {
      await service.sendOtp({ email: 'user@example.com' });

      expect(mockRateLimitService.checkDailyLimit).toHaveBeenCalledWith('user@example.com', undefined);
      expect(mockRateLimitService.checkResendCooldown).toHaveBeenCalledWith('user@example.com', undefined);
    });
  });

  // --- verifyOtp ---

  describe('verifyOtp', () => {
    it('should throw BadRequestException when neither email nor phone provided', async () => {
      await expect(service.verifyOtp({ token: '123456' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when no OTP record found', async () => {
      mockOtpRepository.findOne.mockResolvedValue(null);
      await expect(
        service.verifyOtp({ email: 'user@example.com', token: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when OTP is expired', async () => {
      mockOtpRepository.findOne.mockResolvedValue({
        code: '123456',
        expiresAt: new Date(Date.now() - 60000), // expired 1 min ago
        verifiedAt: null,
        failedAttempts: 0,
      });

      await expect(
        service.verifyOtp({ email: 'user@example.com', token: '123456' }),
      ).rejects.toThrow('OTP expired');
    });

    it('should throw UnauthorizedException when OTP already used', async () => {
      mockOtpRepository.findOne.mockResolvedValue({
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
        verifiedAt: new Date(),
        failedAttempts: 0,
      });

      await expect(
        service.verifyOtp({ email: 'user@example.com', token: '123456' }),
      ).rejects.toThrow('OTP already used');
    });

    it('should throw UnauthorizedException when too many failed attempts', async () => {
      mockOtpRepository.findOne.mockResolvedValue({
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
        verifiedAt: null,
        failedAttempts: 5,
      });

      await expect(
        service.verifyOtp({ email: 'user@example.com', token: '123456' }),
      ).rejects.toThrow('Too many failed attempts');
    });

    it('should increment failedAttempts on wrong code', async () => {
      const otpRecord = {
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
        verifiedAt: null,
        failedAttempts: 2,
      };
      mockOtpRepository.findOne.mockResolvedValue(otpRecord);

      await expect(
        service.verifyOtp({ email: 'user@example.com', token: '999999' }),
      ).rejects.toThrow('Invalid OTP');

      expect(otpRecord.failedAttempts).toBe(3);
      expect(mockOtpRepository.save).toHaveBeenCalledWith(otpRecord);
    });

    it('should verify successfully with correct code', async () => {
      const otpRecord = {
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
        verifiedAt: null,
        failedAttempts: 0,
      };
      mockOtpRepository.findOne.mockResolvedValue(otpRecord);

      const result = await service.verifyOtp({ email: 'user@example.com', token: '123456' });

      expect(result).toEqual({ verified: true, message: 'OTP verified successfully.' });
      expect(otpRecord.verifiedAt).toBeInstanceOf(Date);
      expect(mockOtpRepository.save).toHaveBeenCalledWith(otpRecord);
    });

    it('should verify with 4 failed attempts (under limit)', async () => {
      const otpRecord = {
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
        verifiedAt: null,
        failedAttempts: 4,
      };
      mockOtpRepository.findOne.mockResolvedValue(otpRecord);

      const result = await service.verifyOtp({ email: 'user@example.com', token: '123456' });
      expect(result.verified).toBe(true);
    });
  });

  // --- generateOtp ---

  describe('generateOtp (private)', () => {
    it('should generate a 6-digit numeric string', () => {
      const otp = service['generateOtp']();
      expect(otp).toMatch(/^\d{6}$/);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThanOrEqual(999999);
    });

    it('should generate different OTPs on successive calls', () => {
      const otps = new Set(Array.from({ length: 20 }, () => service['generateOtp']()));
      // With 20 random 6-digit numbers, we should get at least 2 unique values
      expect(otps.size).toBeGreaterThan(1);
    });
  });

  // --- Supabase-dependent methods (instantiation checks) ---

  describe('supabase integration', () => {
    it('should have supabase client initialized', () => {
      expect(service['supabase']).toBeDefined();
    });

    it('should have mailService injected', () => {
      expect(service['mailService']).toBeDefined();
    });
  });
});
