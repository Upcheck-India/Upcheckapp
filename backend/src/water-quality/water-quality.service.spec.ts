import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaterQualityService } from './water-quality.service';
import { WaterQualityRecord } from './water-quality-record.entity';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';
import { NotFoundException } from '@nestjs/common';
import { PondsService } from '../ponds/ponds.service';

describe('WaterQualityService', () => {
  let service: WaterQualityService;
  let repository: MockRepository<WaterQualityRecord>;
  let pondsService: jest.Mocked<PondsService>;
  
  const mockWaterQuality = new WaterQualityRecord();
  mockWaterQuality.id = 'wq-1';
  mockWaterQuality.pondId = 'pond-1';
  mockWaterQuality.recordedAt = new Date();
  mockWaterQuality.ph = 7.5;
  mockWaterQuality.temperature = 28.5;
  mockWaterQuality.dissolvedOxygen = 5.2;
  mockWaterQuality.salinity = 25;
  mockWaterQuality.ammonia = 0.1;
  mockWaterQuality.nitrite = 0.05;
  mockWaterQuality.alkalinity = 120;
  mockWaterQuality.hardness = 80;
  mockWaterQuality.transparency = 30;
  mockWaterQuality.notes = 'Normal readings';
  
  const mockCreateWaterQualityDto: CreateWaterQualityRecordDto = {
    pondId: 'pond-1',
    ph: 7.5,
    temperature: 28.5,
    dissolvedOxygen: 5.2,
    salinity: 25,
    ammonia: 0.1,
    nitrite: 0.05,
    alkalinity: 120,
    hardness: 80,
    transparency: 30,
    notes: 'Normal readings',
  };
  
  const mockUpdateWaterQualityDto: UpdateWaterQualityRecordDto = {
    ph: 7.8,
    dissolvedOxygen: 5.5,
  };
  
  type MockRepository<T = any> = Partial<Record<string, jest.Mock>>;
  
  const createMockRepository = (): MockRepository<WaterQualityRecord> => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaterQualityService,
        {
          provide: getRepositoryToken(WaterQualityRecord),
          useValue: createMockRepository(),
        },
        {
          provide: PondsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WaterQualityService>(WaterQualityService);
    repository = module.get(getRepositoryToken(WaterQualityRecord));
    pondsService = module.get(PondsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('create', () => {
    it('should create a new water quality record', async () => {
      const userId = 'user-1';
      
      pondsService.findOne.mockResolvedValue({} as any);
      (repository.create as jest.Mock).mockReturnValue(mockWaterQuality);
      (repository.save as jest.Mock).mockResolvedValue(mockWaterQuality);
      
      const result = await service.create(mockCreateWaterQualityDto, userId);
      
      expect(pondsService.findOne).toHaveBeenCalledWith(mockCreateWaterQualityDto.pondId, userId);
      expect(repository.create).toHaveBeenCalledWith(mockCreateWaterQualityDto);
      expect(repository.save).toHaveBeenCalledWith(mockWaterQuality);
      expect(result).toEqual(mockWaterQuality);
    });
  });
  
  describe('findAll', () => {
    it('should return all water quality records for a pond', async () => {
      const pondId = 'pond-1';
      const userId = 'user-1';
      const records = [mockWaterQuality];
      
      pondsService.findOne.mockResolvedValue({} as any);
      (repository.find as jest.Mock).mockResolvedValue(records);
      
      const result = await service.findAll(pondId, userId);
      
      expect(pondsService.findOne).toHaveBeenCalledWith(pondId, userId);
      expect(repository.find).toHaveBeenCalledWith({ 
        where: { pondId },
        order: { recordedAt: 'DESC' }
      });
      expect(result).toEqual(records);
    });
    
    it('should return empty array when no pondId provided', async () => {
      const userId = 'user-1';
      
      const result = await service.findAll('', userId);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('findOne', () => {
    it('should return a water quality record by id', async () => {
      const recordId = 'wq-1';
      
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockWaterQuality);
      
      const result = await service.findOne(recordId, 'user-1');
      
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: recordId });
      expect(result).toEqual(mockWaterQuality);
    });
    
    it('should throw NotFoundException when record not found', async () => {
      const recordId = 'non-existent';
      
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);
      
      await expect(service.findOne(recordId, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
  
  describe('update', () => {
    it('should update a water quality record', async () => {
      const recordId = 'wq-1';
      const updatedRecord = { ...mockWaterQuality, ...mockUpdateWaterQualityDto };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockWaterQuality);
      (repository.update as jest.Mock).mockResolvedValue(undefined);
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedRecord);
      
      const result = await service.update(recordId, mockUpdateWaterQualityDto, 'user-1');
      
      expect(service.findOne).toHaveBeenCalledWith(recordId, 'user-1');
      expect(repository.update).toHaveBeenCalledWith(recordId, mockUpdateWaterQualityDto);
      expect(result).toEqual(updatedRecord);
    });
  });
  
  describe('remove', () => {
    it('should remove a water quality record', async () => {
      const recordId = 'wq-1';
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockWaterQuality);
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      
      const result = await service.remove(recordId, 'user-1');
      
      expect(service.findOne).toHaveBeenCalledWith(recordId, 'user-1');
      expect(repository.delete).toHaveBeenCalledWith(recordId);
      expect(result).toEqual({ affected: 1 });
    });
  });
  
  describe('getLatestByPond', () => {
    it('should return the latest water quality record for a pond', async () => {
      const pondId = 'pond-1';
      const userId = 'user-1';
      
      pondsService.findOne.mockResolvedValue({} as any);
      (repository.findOne as jest.Mock).mockResolvedValue(mockWaterQuality);
      
      const result = await service.getLatestByPond(pondId, userId);
      
      expect(pondsService.findOne).toHaveBeenCalledWith(pondId, userId);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { pondId },
        order: { recordedAt: 'DESC' },
      });
      expect(result).toEqual(mockWaterQuality);
    });
  });
});