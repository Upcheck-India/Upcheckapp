import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PondsService } from './ponds.service';
import { Pond } from './pond.entity';
import { PondDimensionHistory } from './pond-dimension-history.entity';
import { FarmsService } from '../farms/farms.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { PondDimensionService } from './pond-dimension.service';
import { PondNamingService } from './pond-naming.service';
import { CreatePondDto } from './dto/create-pond.dto';

describe('PondsService', () => {
  let service: PondsService;
  let pondsRepository: any;
  let historyRepository: any;
  let farmsService: any;
  let farmAccess: any;
  let dimensionService: any;
  let namingService: any;
  let dataSource: any;

  const mockFarm = {
    id: 'farm-1',
    userId: 'user-1',
    name: 'Test Farm',
    farmCode: 'TF001234',
    areaHectares: 10,
    address: '123 Test',
    longitude: 77.5,
    latitude: 12.9,
    waterSourceType: 'tidal',
    qrCodeUrl: '',
    privacySetting: 'private',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPond = {
    id: 'pond-1',
    farmId: 'farm-1',
    name: 'A01',
    namePrefix: 'A',
    sequenceNumber: 1,
    pondCode: 'TF001234:A01',
    displayName: null,
    geometryType: 'rectangular',
    constructionType: 'earthen',
    lengthM: 20,
    widthM: 10,
    diameterM: null,
    depthM: 1.5,
    channelCount: null,
    calculatedAreaM2: 200,
    overrideAreaM2: null,
    gpsLat: null,
    gpsLng: null,
    status: 'fallow',
    archivedAt: null,
    activeCycleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    farm: mockFarm,
    get effectiveAreaM2() { return this.overrideAreaM2 ?? this.calculatedAreaM2; },
    get volumeM3() { return (this.effectiveAreaM2 ?? 0) * (this.depthM ?? 0); },
  };

  beforeEach(async () => {
    pondsRepository = {
      create: jest.fn().mockImplementation(data => ({ ...data, id: 'pond-new' })),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    historyRepository = {
      create: jest.fn().mockImplementation(data => data),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    farmsService = {
      verifyOwnership: jest.fn().mockResolvedValue(mockFarm),
      verifyAccess: jest.fn().mockResolvedValue(mockFarm),
      findOne: jest.fn().mockResolvedValue(mockFarm),
    };

    dimensionService = {
      validateDimensions: jest.fn(),
      calculateArea: jest.fn().mockReturnValue(200),
      calculateVolume: jest.fn().mockReturnValue(300),
      getWarnings: jest.fn().mockReturnValue([]),
      hasDimensionsChanged: jest.fn().mockReturnValue(false),
    };

    namingService = {
      validatePrefix: jest.fn(),
      validatePondLimit: jest.fn(),
      generateBatchNames: jest.fn().mockResolvedValue([
        { name: 'A01', pondCode: 'TF001234:A01', sequenceNumber: 1 },
      ]),
    };

    const mockTransactionManager = {
      save: jest.fn().mockImplementation(entities => entities),
    };
    dataSource = {
      transaction: jest.fn().mockImplementation(async cb => cb(mockTransactionManager)),
    };

    farmAccess = {
      getAccessibleFarmIds: jest.fn().mockResolvedValue([mockFarm.id]),
      assertCanAccessFarm: jest.fn().mockResolvedValue(mockFarm),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        PondsService,
        { provide: getRepositoryToken(Pond), useValue: pondsRepository },
        { provide: getRepositoryToken(PondDimensionHistory), useValue: historyRepository },
        { provide: FarmsService, useValue: farmsService },
        { provide: PondDimensionService, useValue: dimensionService },
        { provide: PondNamingService, useValue: namingService },
        { provide: DataSource, useValue: dataSource },
        { provide: FarmAccessService, useValue: farmAccess },
      ],
    }).compile();

    service = module.get<PondsService>(PondsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create ─────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreatePondDto = {
      farmId: 'farm-1',
      namePrefix: 'A',
      geometryType: 'rectangular',
      constructionType: 'earthen',
      lengthM: 20,
      widthM: 10,
      depthM: 1.5,
    };

    it('should create a single pond with calculated area', async () => {
      const result = await service.create(dto, 'user-1');

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('user-1', 'farm-1', 'WRITE_MANAGEMENT');
      expect(namingService.validatePrefix).toHaveBeenCalledWith('A');
      expect(dimensionService.validateDimensions).toHaveBeenCalled();
      expect(dimensionService.calculateArea).toHaveBeenCalled();
      expect(result).toHaveProperty('pond');
      expect(result).toHaveProperty('calculatedAreaM2');
      expect(result).toHaveProperty('warnings');
    });

    it('should create batch ponds', async () => {
      const batchDto = { ...dto, batchCount: 3 };
      namingService.generateBatchNames.mockResolvedValue([
        { name: 'A01', pondCode: 'TF001234:A01', sequenceNumber: 1 },
        { name: 'A02', pondCode: 'TF001234:A02', sequenceNumber: 2 },
        { name: 'A03', pondCode: 'TF001234:A03', sequenceNumber: 3 },
      ]);

      const result = await service.create(batchDto, 'user-1');

      expect(result).toHaveProperty('ponds');
      expect(result).toHaveProperty('count', 3);
      expect(namingService.validatePondLimit).toHaveBeenCalledWith('farm-1', 3);
    });

    it('should use transaction for bulk save', async () => {
      await service.create(dto, 'user-1');
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw when farm access fails', async () => {
      farmAccess.assertCanAccessFarm.mockRejectedValue(new ForbiddenException());
      await expect(service.create(dto, 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOne ────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return pond for authorized user', async () => {
      pondsRepository.findOne.mockResolvedValue(mockPond);
      const result = await service.findOne('pond-1', 'user-1');
      expect(result).toEqual(mockPond);
    });

    it('should throw NotFoundException when not found', async () => {
      pondsRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────────

  describe('update', () => {
    it('should update without history when no dimension change', async () => {
      pondsRepository.findOne.mockResolvedValue(mockPond);
      dimensionService.hasDimensionsChanged.mockReturnValue(false);
      pondsRepository.update.mockResolvedValue(undefined);

      await service.update('pond-1', { displayName: 'Pond Alpha' }, 'user-1');

      expect(historyRepository.save).not.toHaveBeenCalled();
      expect(pondsRepository.update).toHaveBeenCalledWith('pond-1', { displayName: 'Pond Alpha' });
    });

    it('should log history and recalculate when dimensions change', async () => {
      pondsRepository.findOne.mockResolvedValue(mockPond);
      dimensionService.hasDimensionsChanged.mockReturnValue(true);
      dimensionService.calculateArea.mockReturnValue(250);
      pondsRepository.update.mockResolvedValue(undefined);

      await service.update('pond-1', { lengthM: 25, changeReason: 'Measured again' }, 'user-1');

      expect(historyRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        pondId: 'pond-1',
        lengthMBefore: 20,
        changeReason: 'Measured again',
      }));
      expect(historyRepository.save).toHaveBeenCalled();
      expect(pondsRepository.update).toHaveBeenCalledWith('pond-1', expect.objectContaining({
        calculatedAreaM2: 250,
      }));
    });
  });

  // ── archive ────────────────────────────────────────────────

  describe('archive', () => {
    it('should archive fallow pond', async () => {
      pondsRepository.findOne.mockResolvedValue(mockPond);
      pondsRepository.update.mockResolvedValue(undefined);

      const result = await service.archive('pond-1', 'user-1');
      expect(result.message).toContain('archived');
      expect(pondsRepository.update).toHaveBeenCalledWith('pond-1', expect.objectContaining({
        status: 'archived',
        archivedAt: expect.any(Date),
      }));
    });

    it('should throw 409 when pond has active cycle', async () => {
      pondsRepository.findOne.mockResolvedValue({ ...mockPond, activeCycleId: 'cycle-1' });
      await expect(service.archive('pond-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw when already archived', async () => {
      pondsRepository.findOne.mockResolvedValue({ ...mockPond, status: 'archived' });
      await expect(service.archive('pond-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove ─────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete pond', async () => {
      pondsRepository.findOne.mockResolvedValue(mockPond);
      pondsRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('pond-1', 'user-1');
      expect(result.message).toContain('deleted');
    });

    it('should throw when active cycle exists', async () => {
      pondsRepository.findOne.mockResolvedValue({ ...mockPond, activeCycleId: 'cycle-1' });
      await expect(service.remove('pond-1', 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  // ── getDimensionHistory ────────────────────────────────────

  describe('getDimensionHistory', () => {
    it('should return history after ownership check', async () => {
      pondsRepository.findOne.mockResolvedValue(mockPond);
      historyRepository.findAndCount.mockResolvedValue([[{ id: 'h1' }], 1]);

      const result = await service.getDimensionHistory('pond-1', 'user-1');
      expect(result.data).toEqual([{ id: 'h1' }]);
    });
  });
});
