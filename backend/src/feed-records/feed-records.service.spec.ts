
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedRecordsService } from './feed-records.service';
import { FeedRecord } from './feed-record.entity';
import { PondsService } from '../ponds/ponds.service';
import { InventoryService } from '../inventory/inventory.service';

// Mock repository factory
const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'test-id' })),
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ totalFeed: 100 }),
  })),
});

describe('FeedRecordsService', () => {
  let service: FeedRecordsService;
  let mockRepository: any;
  let module: TestingModule; // Correctly scoped module variable

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        FeedRecordsService,
        {
          provide: getRepositoryToken(FeedRecord),
          useValue: createMockRepository(),
        },
        {
          provide: PondsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            adjustStock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FeedRecordsService>(FeedRecordsService);
    mockRepository = module.get<Repository<FeedRecord>>(getRepositoryToken(FeedRecord));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new feed record', async () => {
      const createDto = {
        pondId: 'pond-1',
        feedType: 'Pellet Feed',
        feedBrand: 'Aquatic Nutrition',
        quantityKg: 50,
        feedingTime: '08:00',
        feedingMethod: 'Manual',
        waterTemperature: 28,
        notes: 'Morning feeding',
        inventoryItemId: 'inv-item-1' // Added this
      };

      // Mock PondsService to return a pond with activeCycleId
      const pondServiceMock = module.get<PondsService>(PondsService);
      jest.spyOn(pondServiceMock, 'findOne').mockResolvedValue({
        id: 'pond-1',
        activeCycleId: 'crop-1',
        userId: 'user-1',
        farmId: 'farm-1'
      } as any);

      // Mock InventoryService
      const inventoryServiceMock = module.get<InventoryService>(InventoryService);
      jest.spyOn(inventoryServiceMock, 'adjustStock').mockResolvedValue({} as any);

      const result = await service.create(createDto, 'user-1');

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        cropId: 'crop-1'
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(inventoryServiceMock.adjustStock).toHaveBeenCalledWith('inv-item-1', -50); // Verify deduction
      expect(result).toEqual(expect.objectContaining(createDto));
    });

    it('should not deduct stock if inventoryItemId is missing', async () => {
      const createDto = {
        pondId: 'pond-1',
        feedType: 'Manual Feed',
        quantityKg: 50,
      };

      const pondServiceMock = module.get<PondsService>(PondsService);
      jest.spyOn(pondServiceMock, 'findOne').mockResolvedValue({ id: 'pond-1', activeCycleId: 'crop-1' } as any);

      const inventoryServiceMock = module.get<InventoryService>(InventoryService);

      await service.create(createDto as any, 'user-1');

      expect(inventoryServiceMock.adjustStock).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all feed records', async () => {
      const mockRecords = [{ id: '1', quantityKg: 50 }];
      mockRepository.find.mockResolvedValue(mockRecords);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({ order: { recordedAt: 'DESC' } });
      expect(result).toEqual(mockRecords);
    });

    it('should filter by pondId', async () => {
      const pondId = 'pond-1';
      await service.findAll(pondId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { pondId },
        order: { recordedAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a feed record by id', async () => {
      const recordId = 'record-1';
      const mockRecord = { id: recordId, quantityKg: 50 };
      mockRepository.findOneBy.mockResolvedValue(mockRecord);

      const result = await service.findOne(recordId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: recordId });
      expect(result).toEqual(mockRecord);
    });
  });

  describe('update', () => {
    it('should update a feed record', async () => {
      const recordId = 'record-1';
      const updateDto = { quantityKg: 75 };
      const updatedRecord = { id: recordId, quantityKg: 75 };

      mockRepository.findOneBy.mockResolvedValue(updatedRecord);

      const result = await service.update(recordId, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(recordId, updateDto);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: recordId });
      expect(result).toEqual(updatedRecord);
    });
  });

  describe('remove', () => {
    it('should remove a feed record', async () => {
      const recordId = 'record-1';
      const result = await service.remove(recordId);

      expect(mockRepository.delete).toHaveBeenCalledWith(recordId);
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('getTotalFeedByPond', () => {
    it('should return total feed for a pond', async () => {
      const pondId = 'pond-1';
      const mockResult = { totalFeed: '150' };

      mockRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      });

      const result = await service.getTotalFeedByPond(pondId);

      expect(result).toBe("150");
    });
  });
});
