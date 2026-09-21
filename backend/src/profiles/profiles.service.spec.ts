import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProfilesService } from './profiles.service';
import { Profile } from './profile.entity';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { AvatarService } from '../avatars/avatar.service';
import { PhotoDeletionService } from '../storage/photo-deletion.service';

// Mock repository factory
const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest
    .fn()
    .mockImplementation((entity) =>
      Promise.resolve({ ...entity, id: 'test-id' }),
    ),
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});

describe('ProfilesService', () => {
  let service: ProfilesService;
  let mockRepository: any;
  let authService: any;
  let avatars: any;
  let deletions: { enqueue: jest.Mock };
  let manager: { query: jest.Mock };
  const FARM_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const FARM_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeEach(async () => {
    manager = {
      query: jest.fn(async (sql: string) =>
        /FROM farms WHERE user_id/.test(sql) ? [{ id: FARM_1 }, { id: FARM_2 }] : [],
      ),
    };
    deletions = { enqueue: jest.fn().mockResolvedValue(true) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://dummy.com') },
        },
        {
          provide: DataSource,
          useValue: {
            // Invoke the callback with a manager whose query() is a spy, so
            // deleteAccount's cascade transaction can be asserted.
            transaction: jest.fn((cb) => cb(manager)),
          },
        },
        {
          provide: SupabaseAuthService,
          useValue: {
            deleteUser: jest.fn().mockResolvedValue(undefined),
            getUserById: jest.fn().mockResolvedValue({
              id: 'test-id',
              email: 'user@test.com',
              identities: [{ provider: 'email' }],
            }),
            verifyPassword: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: AvatarService, useValue: { purgeUser: jest.fn().mockResolvedValue(undefined) } },
        { provide: PhotoDeletionService, useValue: deletions },
        ProfilesService,
        {
          provide: getRepositoryToken(Profile),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    mockRepository = module.get<Repository<Profile>>(
      getRepositoryToken(Profile),
    );
    authService = module.get(SupabaseAuthService);
    avatars = module.get(AvatarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new profile', async () => {
      const createDto = {
        username: 'johndoe',
        fullName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        website: 'https://johndoe.com',
        languagePreference: 'en',
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(createDto));
    });
  });

  describe('findOne', () => {
    it('should return a profile by id', async () => {
      const profileId = 'user-1';
      const mockProfile = {
        id: profileId,
        username: 'johndoe',
        fullName: 'John Doe',
      };
      mockRepository.findOneBy.mockResolvedValue(mockProfile);

      const result = await service.findOne(profileId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: profileId });
      expect(result).toEqual(mockProfile);
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const profileId = 'user-1';
      const updateDto = { fullName: 'Jane Doe' };
      const updatedProfile = {
        id: profileId,
        username: 'johndoe',
        fullName: 'Jane Doe',
      };

      mockRepository.findOneBy.mockResolvedValue(updatedProfile);

      const result = await service.update(profileId, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(profileId, updateDto);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: profileId });
      expect(result).toEqual(updatedProfile);
    });
  });

  describe('deleteAccount', () => {
    it("purges the user's profile pictures from R2 before deleting the account", async () => {
      const order: string[] = [];
      avatars.purgeUser.mockImplementation(async () => { order.push('purge'); });
      authService.deleteUser.mockImplementation(async () => { order.push('auth'); });
      await service.deleteAccount('test-id', 'correct-password');
      expect(avatars.purgeUser).toHaveBeenCalledWith('test-id');
      expect(order).toEqual(['purge', 'auth']);
    });

    it('F1: queues feedback/<userId>/ and every owned farm, in the transaction, BEFORE the users row goes', async () => {
      const order: string[] = [];
      deletions.enqueue.mockImplementation(async () => { order.push('enqueue'); return true; });
      const realQuery = manager.query.getMockImplementation()!;
      manager.query.mockImplementation(async (sql: string, p?: unknown[]) => {
        if (/^DELETE FROM users/.test(sql)) order.push('delete-user');
        return realQuery(sql, p);
      });

      await service.deleteAccount('test-id', 'correct-password');

      expect(deletions.enqueue).toHaveBeenCalledWith(
        [
          { namespace: 'feedback', path: 'test-id/' },
          { namespace: 'health', path: `${FARM_1}/` },
          { namespace: 'health', path: `${FARM_2}/` },
        ],
        'account_deleted',
        'test-id',
        manager,
      );
      expect(order).toEqual(['enqueue', 'delete-user']);
    });

    it('a failed purge aborts the deletion (retryable), never leaving photos behind', async () => {
      avatars.purgeUser.mockRejectedValueOnce(new Error('R2 down'));
      await expect(service.deleteAccount('test-id', 'correct-password')).rejects.toThrow('R2 down');
      expect(authService.deleteUser).not.toHaveBeenCalled();
    });

    it('re-authenticates a password account before deleting', async () => {
      await service.deleteAccount('test-id', 'correct-password');

      expect(authService.verifyPassword).toHaveBeenCalledWith(
        'user@test.com',
        'correct-password',
      );
      expect(authService.deleteUser).toHaveBeenCalledWith('test-id');
    });

    it('rejects a password account when no password is supplied', async () => {
      await expect(service.deleteAccount('test-id')).rejects.toMatchObject({
        status: 401,
      });
      expect(authService.deleteUser).not.toHaveBeenCalled();
    });

    it('propagates a wrong-password rejection and never deletes', async () => {
      authService.verifyPassword.mockRejectedValueOnce(
        new UnauthorizedException('Password is incorrect'),
      );

      await expect(
        service.deleteAccount('test-id', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authService.deleteUser).not.toHaveBeenCalled();
    });

    it('skips password re-auth for an OAuth account (no email identity)', async () => {
      authService.getUserById.mockResolvedValueOnce({
        id: 'test-id',
        email: 'oauth@test.com',
        identities: [{ provider: 'google' }],
      });

      await service.deleteAccount('test-id');

      expect(authService.verifyPassword).not.toHaveBeenCalled();
      expect(authService.deleteUser).toHaveBeenCalledWith('test-id');
    });
  });
});
