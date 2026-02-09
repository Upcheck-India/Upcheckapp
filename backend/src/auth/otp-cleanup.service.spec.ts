import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpCleanupService } from './otp-cleanup.service';
import { OtpCode } from './otp-code.entity';

describe('OtpCleanupService', () => {
  let service: OtpCleanupService;
  let mockRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 5 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpCleanupService,
        { provide: getRepositoryToken(OtpCode), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OtpCleanupService>(OtpCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupExpiredOtps', () => {
    it('should delete expired OTP records', async () => {
      await service.cleanupExpiredOtps();
      expect(mockRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('should pass LessThan(now) as the expiry filter', async () => {
      const before = new Date();
      await service.cleanupExpiredOtps();
      const after = new Date();

      const deleteArg = mockRepository.delete.mock.calls[0][0];
      expect(deleteArg).toHaveProperty('expiresAt');
      // The LessThan operator wraps the date value
      const filterValue = deleteArg.expiresAt._value;
      expect(filterValue.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(filterValue.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
