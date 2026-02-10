import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PondsService } from './ponds.service';
import { Pond } from './pond.entity';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FarmsService } from '../farms/farms.service';

describe('PondsService', () => {
  let service: PondsService;
  let repository: MockRepository;
  let farmsService: jest.Mocked<FarmsService>;
  
  const mockFarm = {
    id: 'farm-1',
    userId: 'user-1',
    name: 'Test Farm',
    farmCode: 'F001',
    areaHectares: 10,
    address: '123 Test Street',
    longitude: 77.5946,
    latitude: 12.9716,
    qrCodeUrl: 'https://example.com/qrcode',
    privacySetting: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const mockPondEntity = {
    id: 'pond-1',
    farmId: 'farm-1',
    name: 'Test Pond',
    namePrefix: 'P',
    autoNumber: 1,
    pondCode: 'P001',
    type: 'square',
    lengthM: 20,
    widthM: 20,
    areaM2: 1000,
    depthM: 1.5,
    rfidTag: 'RFID001',
    speciesType: 'vannamei',
    stockingDate: new Date(), // Date for entity
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    farm: mockFarm,
  };
  
  const mockPond = mockPondEntity;
  
  const mockCreatePondDto: CreatePondDto = {
    farmId: 'farm-1',
    name: 'New Pond',
    pondCode: 'P002',
    areaM2: 1200,
    depthM: 1.8,
    speciesType: 'vannamei',
    stockingDate: new Date().toISOString(), // String as expected by DTO
    status: 'active',
  };
  
  const mockUpdatePondDto: UpdatePondDto = {
    name: 'Updated Pond',
    areaM2: 1500,
  };
  
  type MockRepository = Partial<Record<keyof Repository<any>, jest.Mock>> & { [K in keyof Repository<any>]?: jest.Mock };
  
  const createMockRepository = (): MockRepository => ({
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
        PondsService,
        {
          provide: getRepositoryToken(Pond),
          useValue: createMockRepository(),
        },
        {
          provide: FarmsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PondsService>(PondsService);
    repository = module.get(getRepositoryToken(Pond));
    farmsService = module.get(FarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('create', () => {
    it('should create a new pond', async () => {
      const userId = 'user-1';
      
      farmsService.findOne.mockResolvedValue(mockFarm);
      (repository.create as jest.Mock).mockReturnValue(mockPond);
      (repository.save as jest.Mock).mockResolvedValue(mockPond);
      
      const result = await service.create(mockCreatePondDto, userId);
      
      expect(farmsService.findOne).toHaveBeenCalledWith(mockCreatePondDto.farmId, userId);
      expect(repository.create).toHaveBeenCalledWith(mockCreatePondDto);
      expect(repository.save).toHaveBeenCalledWith(mockPond);
      expect(result).toEqual(mockPond);
    });
  });
  
  describe('findAll', () => {
    it('should return all ponds for a farm', async () => {
      const farmId = 'farm-1';
      const userId = 'user-1';
      const ponds = [mockPond];
      
      farmsService.findOne.mockResolvedValue(mockFarm);
      (repository.find as jest.Mock).mockResolvedValue(ponds);
      
      const result = await service.findAll(farmId, userId);
      
      expect(farmsService.findOne).toHaveBeenCalledWith(farmId, userId);
      expect(repository.find).toHaveBeenCalledWith({ where: { farmId } });
      expect(result).toEqual(ponds);
    });
  });
  
  describe('findOne', () => {
    it('should return a pond by id for authorized user', async () => {
      const pondId = 'pond-1';
      const userId = 'user-1';
      
      (repository.findOne as jest.Mock).mockResolvedValue(mockPond);
      
      const result = await service.findOne(pondId, userId);
      
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: pondId },
        relations: ['farm'],
      });
      expect(result).toEqual(mockPond);
    });
    
    it('should throw NotFoundException when pond not found', async () => {
      const pondId = 'non-existent';
      const userId = 'user-1';
      
      (repository.findOne as jest.Mock).mockResolvedValue(null);
      
      await expect(service.findOne(pondId, userId)).rejects.toThrow(NotFoundException);
    });
    
    it('should throw ForbiddenException when user is not owner', async () => {
      const pondId = 'pond-1';
      const userId = 'user-2'; // Different user
      const pondWithDifferentOwner = { 
        ...mockPond, 
        farm: { ...mockFarm, userId: 'user-1' } 
      };
      
      (repository.findOne as jest.Mock).mockResolvedValue(pondWithDifferentOwner);
      
      await expect(service.findOne(pondId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
  
  describe('update', () => {
    it('should update a pond', async () => {
      const pondId = 'pond-1';
      const userId = 'user-1';
      const updatedPond = { 
        ...mockPond, 
        name: 'Updated Pond',
        areaM2: 1500,
        // Convert string stockingDate to Date for entity
        stockingDate: typeof mockPond.stockingDate === 'string' ? new Date(mockPond.stockingDate) : mockPond.stockingDate
      };
      
      // Mock the findOne call inside update
      jest.spyOn(service, 'findOne').mockResolvedValue(mockPond);
      (repository.update as jest.Mock).mockResolvedValue(undefined);
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedPond);
      
      const result = await service.update(pondId, mockUpdatePondDto, userId);
      
      expect(service.findOne).toHaveBeenCalledWith(pondId, userId);
      expect(repository.update).toHaveBeenCalledWith(pondId, mockUpdatePondDto);
      expect(result).toEqual(updatedPond);
    });
  });
  
  describe('remove', () => {
    it('should remove a pond', async () => {
      const pondId = 'pond-1';
      const userId = 'user-1';
      
      // Mock the findOne call inside remove
      jest.spyOn(service, 'findOne').mockResolvedValue(mockPond);
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      
      const result = await service.remove(pondId, userId);
      
      expect(service.findOne).toHaveBeenCalledWith(pondId, userId);
      expect(repository.delete).toHaveBeenCalledWith(pondId);
      expect(result).toEqual({ affected: 1 });
    });
  });
  
  describe('calculateVolume', () => {
    it('should calculate pond volume correctly', () => {
      const area = 1000;
      const depth = 1.5;
      const expectedVolume = 1500;
      
      const result = service.calculateVolume(area, depth);
      
      expect(result).toBe(expectedVolume);
    });
    
    it('should handle zero values', () => {
      const result = service.calculateVolume(0, 1.5);
      expect(result).toBe(0);
    });
  });
});
