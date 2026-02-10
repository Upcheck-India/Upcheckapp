import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmsService } from './farms.service';
import { Farm } from './farm.entity';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('FarmsService', () => {
  let service: FarmsService;
  let repository: MockRepository;
  
  const mockFarm = {
    id: 'test-id',
    userId: 'user-1',
    name: 'Test Farm',
    farmCode: 'TF001',
    areaHectares: 10.5,
    address: 'Test Address',
    longitude: 80.123,
    latitude: 13.456,
    qrCodeUrl: '',
    privacySetting: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const mockCreateFarmDto: CreateFarmDto = {
    userId: 'user-1',
    name: 'New Farm',
    farmCode: 'NF001',
    areaHectares: 15.0,
    address: 'New Address',
    longitude: 80.789,
    latitude: 13.123,
  };
  
  const mockUpdateFarmDto: UpdateFarmDto = {
    name: 'Updated Farm',
    areaHectares: 20.0,
  };
  
  type MockRepository = Partial<Record<keyof Repository<any>, jest.Mock>> & { [K in keyof Repository<any>]?: jest.Mock };
  
  const createMockRepository = (): MockRepository => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmsService,
        {
          provide: getRepositoryToken(Farm),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<FarmsService>(FarmsService);
    repository = module.get(getRepositoryToken(Farm));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('create', () => {
    it('should create a new farm', async () => {
      const userId = 'user-1';
      
      (repository.create as jest.Mock).mockReturnValue(mockFarm);
      (repository.save as jest.Mock).mockResolvedValue(mockFarm);
      
      const result = await service.create(mockCreateFarmDto, userId);
      
      expect(repository.create).toHaveBeenCalledWith({
        ...mockCreateFarmDto,
        userId,
      });
      expect(repository.save).toHaveBeenCalledWith(mockFarm);
      expect(result).toEqual(mockFarm);
    });
  });
  
  describe('findAll', () => {
    it('should return all farms for a user', async () => {
      const userId = 'user-1';
      const farms = [mockFarm];
      
      (repository.find as jest.Mock).mockResolvedValue(farms);
      
      const result = await service.findAll(userId);
      
      expect(repository.find).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toEqual(farms);
    });
  });
  
  describe('findOne', () => {
    it('should return a farm by id for authorized user', async () => {
      const farmId = 'test-id';
      const userId = 'user-1';
      
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockFarm);
      
      const result = await service.findOne(farmId, userId);
      
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: farmId });
      expect(result).toEqual(mockFarm);
    });
    
    it('should throw NotFoundException when farm not found', async () => {
      const farmId = 'non-existent';
      const userId = 'user-1';
      
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);
      
      await expect(service.findOne(farmId, userId)).rejects.toThrow(NotFoundException);
    });
    
    it('should throw ForbiddenException when user is not owner', async () => {
      const farmId = 'test-id';
      const userId = 'user-2'; // Different user
      const farmWithDifferentOwner = { ...mockFarm, userId: 'user-1' };
      
      (repository.findOneBy as jest.Mock).mockResolvedValue(farmWithDifferentOwner);
      
      await expect(service.findOne(farmId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
  
  describe('update', () => {
    it('should update a farm', async () => {
      const farmId = 'test-id';
      const userId = 'user-1';
      const updatedFarm = { ...mockFarm, ...mockUpdateFarmDto };
      
      // Mock the findOne call inside update
      jest.spyOn(service, 'findOne').mockResolvedValue(mockFarm);
      (repository.update as jest.Mock).mockResolvedValue(undefined);
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedFarm);
      
      const result = await service.update(farmId, mockUpdateFarmDto, userId);
      
      expect(repository.update).toHaveBeenCalledWith(farmId, mockUpdateFarmDto);
      expect(result).toEqual(updatedFarm);
    });
  });
  
  describe('remove', () => {
    it('should remove a farm', async () => {
      const farmId = 'test-id';
      const userId = 'user-1';
      
      // Mock the findOne call inside remove
      jest.spyOn(service, 'findOne').mockResolvedValue(mockFarm);
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      
      const result = await service.remove(farmId, userId);
      
      expect(repository.delete).toHaveBeenCalledWith(farmId);
      expect(result).toEqual({ affected: 1 });
    });
  });
});
