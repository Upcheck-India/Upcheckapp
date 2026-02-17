import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FarmsService } from './farms.service';
import { Farm } from './farm.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('FarmsService', () => {
  let service: FarmsService;
  let repository: any;

  const mockFarm: Partial<Farm> = {
    id: 'farm-1',
    userId: 'user-1',
    name: 'Test Farm',
    farmCode: 'TF001234',
    areaHectares: 10.5,
    address: 'Test Address',
    longitude: 80.123,
    latitude: 13.456,
    waterSourceType: 'tidal',
    qrCodeUrl: '',
    privacySetting: 'private',
    deletedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmsService,
        { provide: getRepositoryToken(Farm), useValue: repository },
      ],
    }).compile();

    service = module.get<FarmsService>(FarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── verifyOwnership ────────────────────────────────────────

  describe('verifyOwnership', () => {
    it('should return farm when user is owner', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      const result = await service.verifyOwnership('farm-1', 'user-1');
      expect(result).toEqual(mockFarm);
    });

    it('should throw NotFoundException when farm not found', async () => {
      repository.findOneBy.mockResolvedValue(null);
      await expect(service.verifyOwnership('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted farm', async () => {
      repository.findOneBy.mockResolvedValue({ ...mockFarm, deletedAt: new Date() });
      await expect(service.verifyOwnership('farm-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      await expect(service.verifyOwnership('farm-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── create ─────────────────────────────────────────────────

  describe('create', () => {
    it('should create farm with auto-generated farm code', async () => {
      repository.findOneBy.mockResolvedValue(null); // No collision
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);

      const result = await service.create({ name: 'New Farm' }, 'user-1');
      expect(result).toEqual(mockFarm);
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Farm',
        userId: 'user-1',
      }));
    });

    it('should use provided farm code if given', async () => {
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);

      await service.create({ name: 'Farm', farmCode: 'CUSTOM01' }, 'user-1');
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        farmCode: 'CUSTOM01',
      }));
    });
  });

  // ── findAll ────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all farms for user', async () => {
      repository.find.mockResolvedValue([mockFarm]);
      const result = await service.findAll('user-1');
      expect(result).toEqual([mockFarm]);
      expect(repository.find).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
  });

  // ── update ─────────────────────────────────────────────────

  describe('update', () => {
    it('should update farm after verifying ownership', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.update.mockResolvedValue(undefined);

      const result = await service.update('farm-1', { name: 'Updated' }, 'user-1');
      expect(repository.update).toHaveBeenCalledWith('farm-1', { name: 'Updated' });
    });

    it('should throw ForbiddenException for non-owner', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      await expect(service.update('farm-1', { name: 'X' }, 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove (soft delete) ───────────────────────────────────

  describe('remove', () => {
    it('should soft-delete farm with deletedAt', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.update.mockResolvedValue(undefined);

      const result = await service.remove('farm-1', 'user-1');
      expect(repository.update).toHaveBeenCalledWith('farm-1', expect.objectContaining({
        deletedAt: expect.any(Date),
      }));
      expect(result.message).toContain('archived');
    });
  });
});
