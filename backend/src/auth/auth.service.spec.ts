import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { Profile } from '../profiles/profile.entity';
import { RefreshToken } from './refresh-token.entity';

// Mock crypto globally for the test file
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash'),
  }),
}));

const mockConfigService = {
  get: jest.fn().mockReturnValue('mock-client-id'),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-id' }),
};

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: Record<string, jest.Mock>;
  let mockProfileRepository: Record<string, jest.Mock>;
  let mockRefreshTokenRepository: Record<string, jest.Mock>;
  let mockDataSource: any;
  let mockEntityManager: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    mockProfileRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockRefreshTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
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
        { provide: getRepositoryToken(Profile), useValue: mockProfileRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Mock Google Client verifyIdToken
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: jest.fn().mockReturnValue({
          sub: 'google-id',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'avatar.jpg',
        }),
      }),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('googleLogin', () => {
    it('should return tokens for existing user', async () => {
      const user = { id: 'user-id', email: 'test@example.com', googleId: 'google-id' };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockRefreshTokenRepository.create.mockReturnValue({ token: 'rt' });

      const result = await service.googleLogin({ token: 'google-token' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).toEqual(user);
    });

    it('should create new user and return tokens', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = { id: 'new-user-id', email: 'test@example.com' };
      mockEntityManager.create.mockReturnValue(newUser);
      mockEntityManager.save.mockResolvedValue(newUser);
      mockRefreshTokenRepository.create.mockReturnValue({ token: 'rt' });

      const result = await service.googleLogin({ token: 'google-token' });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });

  describe('refreshToken', () => {
    it('should rotate tokens on valid refresh token', async () => {
      const user = { id: 'user-id' };
      const tokenEntity = {
        id: 'token-id',
        tokenHash: 'mock-hash',
        user,
        expiresAt: new Date(Date.now() + 10000),
        isRevoked: false
      };

      // First findOne for validate
      mockRefreshTokenRepository.findOne
        .mockResolvedValueOnce(tokenEntity)
        .mockResolvedValueOnce(tokenEntity); // Second findOne for rotation

      mockRefreshTokenRepository.create.mockReturnValue({ token: 'new-rt' });

      const result = await service.refreshToken('old-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({ ...tokenEntity, isRevoked: true });
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should detect reuse and throw', async () => {
      const tokenEntity = {
        id: 'token-id',
        tokenHash: 'mock-hash',
        user: { id: 'user-id' },
        expiresAt: new Date(Date.now() + 10000),
        isRevoked: true // Already revoked
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(tokenEntity);

      await expect(service.refreshToken('reused-token')).rejects.toThrow(UnauthorizedException);
      // It calls handleRefreshTokenReuse locally, effectively returning null from validateRefreshToken
      // The service then throws "Invalid or expired refresh token"
    });
  });

  describe('logout', () => {
    it('should revoke token', async () => {
      const tokenEntity = { id: 'token-id', isRevoked: false };
      mockRefreshTokenRepository.findOne.mockResolvedValue(tokenEntity);

      await service.logout('token');

      expect(tokenEntity.isRevoked).toBe(true);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(tokenEntity);
    });
  });
});
