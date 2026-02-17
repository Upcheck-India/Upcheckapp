import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { OtpCode } from './otp-code.entity';
import { RefreshToken } from './refresh-token.entity';
import { LoginHistory } from './login-history.entity';
import { EmailService } from '../email.service';
import { RedisService } from '../redis/redis.service';

// Mock crypto globally
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash'),
  }),
}));

const mockConfigService = {
  get: jest.fn().mockReturnValue('mock-value'),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-id' }),
  verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id' }),
};

const mockEmailService = {
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendOtpEmail: jest.fn(),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: Record<string, jest.Mock>;
  let mockOtpRepository: Record<string, jest.Mock>;
  let mockRefreshTokenRepository: Record<string, jest.Mock>;
  let mockLoginHistoryRepository: Record<string, jest.Mock>;
  let mockDataSource: any;
  let mockEntityManager: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    mockOtpRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    mockRefreshTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockLoginHistoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockEntityManager = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(OtpCode), useValue: mockOtpRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepository },
        { provide: getRepositoryToken(LoginHistory), useValue: mockLoginHistoryRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EmailService, useValue: mockEmailService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Mock Google Client verifyIdToken
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: jest.fn().mockReturnValue({
          sub: 'google-id',
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
          picture: 'avatar.jpg',
        }),
      }),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('googleAuth', () => {
    it('should return tokens for existing user', async () => {
      const user = { id: 'user-id', email: 'test@example.com', googleId: 'google-id' };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockRefreshTokenRepository.create.mockReturnValue({ tokenHash: 'rt' });
      mockRefreshTokenRepository.save.mockResolvedValue({ tokenHash: 'rt' });
      mockLoginHistoryRepository.create.mockReturnValue({});
      mockLoginHistoryRepository.save.mockResolvedValue({});

      const result = await service.googleAuth({ idToken: 'google-token' });

      expect(result).toHaveProperty('message', 'Google authentication successful');
      expect(result).toHaveProperty('user');
    });

    it('should throw ConflictException for email collision', async () => {
      const existingUser = { id: 'user-id', email: 'test@example.com', googleId: null };
      mockUserRepository.findOne
        .mockResolvedValueOnce(null)          // findOne by googleId
        .mockResolvedValueOnce(existingUser); // findOne by email

      await expect(service.googleAuth({ idToken: 'google-token' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken', () => {
    it('should rotate tokens on valid refresh token', async () => {
      const user = { id: 'user-id' };
      const tokenEntity = {
        id: 'token-id',
        tokenHash: 'mock-hash',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 10000),
        isRevoked: false,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(tokenEntity);
      mockRefreshTokenRepository.save.mockResolvedValue(tokenEntity);
      mockUserRepository.findOne.mockResolvedValue(user);
      mockRefreshTokenRepository.create.mockReturnValue({ tokenHash: 'new-rt' });
      mockLoginHistoryRepository.create.mockReturnValue({});
      mockLoginHistoryRepository.save.mockResolvedValue({});

      const result = await service.refreshToken({ refreshToken: 'old-token' });

      expect(result).toHaveProperty('message', 'Token refreshed successfully');
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);
      await expect(service.refreshToken({ refreshToken: 'invalid-token' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke token', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.logout('user-id', 'token');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { tokenHash: 'token' },
        { isRevoked: true },
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
