import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { OtpCode } from './otp-code.entity';

describe('OtpRateLimitService', () => {
  let service: OtpRateLimitService;
  let mockRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepository = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpRateLimitService,
        { provide: getRepositoryToken(OtpCode), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OtpRateLimitService>(OtpRateLimitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDailyLimit', () => {
    it('should return true if no target provided', async () => {
      const result = await service.checkDailyLimit(undefined, undefined);
      expect(result).toBe(true);
      expect(mockRepository.count).not.toHaveBeenCalled();
    });

    it('should return true when under daily limit (email)', async () => {
      mockRepository.count.mockResolvedValue(5);
      const result = await service.checkDailyLimit('user@example.com');
      expect(result).toBe(true);
    });

    it('should return false when at daily limit (email)', async () => {
      mockRepository.count.mockResolvedValue(10);
      const result = await service.checkDailyLimit('user@example.com');
      expect(result).toBe(false);
    });

    it('should return false when over daily limit (email)', async () => {
      mockRepository.count.mockResolvedValue(15);
      const result = await service.checkDailyLimit('user@example.com');
      expect(result).toBe(false);
    });

    it('should return true when under daily limit (phone)', async () => {
      mockRepository.count.mockResolvedValue(3);
      const result = await service.checkDailyLimit(undefined, '+919876543210');
      expect(result).toBe(true);
    });

    it('should return false when at daily limit (phone)', async () => {
      mockRepository.count.mockResolvedValue(10);
      const result = await service.checkDailyLimit(undefined, '+919876543210');
      expect(result).toBe(false);
    });

    it('should query with email when both email and phone provided', async () => {
      mockRepository.count.mockResolvedValue(0);
      await service.checkDailyLimit('user@example.com', '+919876543210');
      const whereArg = mockRepository.count.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('email', 'user@example.com');
      expect(whereArg).not.toHaveProperty('phone');
    });
  });

  describe('checkResendCooldown', () => {
    it('should return true if no target provided', async () => {
      const result = await service.checkResendCooldown(undefined, undefined);
      expect(result).toBe(true);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return true when no recent OTP found (email)', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.checkResendCooldown('user@example.com');
      expect(result).toBe(true);
    });

    it('should return false when recent OTP exists (email)', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'otp-1', email: 'user@example.com' });
      const result = await service.checkResendCooldown('user@example.com');
      expect(result).toBe(false);
    });

    it('should return true when no recent OTP found (phone)', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.checkResendCooldown(undefined, '+919876543210');
      expect(result).toBe(true);
    });

    it('should return false when recent OTP exists (phone)', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'otp-1', phone: '+919876543210' });
      const result = await service.checkResendCooldown(undefined, '+919876543210');
      expect(result).toBe(false);
    });
  });
});
