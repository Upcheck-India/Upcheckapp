import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryService } from './inventory.service';
import { InventoryItem } from './inventory-item.entity';

// Mock repository factory
const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'test-id' })),
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let mockRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(InventoryItem),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    mockRepository = module.get<Repository<InventoryItem>>(getRepositoryToken(InventoryItem));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new inventory item', async () => {
      const createDto = {
        farmId: 'farm-1',
        name: 'Fish Feed',
        category: 'feed',
        quantity: 100,
        unit: 'kg',
        unitPrice: 50,
        reorderLevel: 20
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(createDto));
    });
  });

  describe('findAll', () => {
    it('should return all inventory items', async () => {
      const mockItems = [{ id: '1', name: 'Fish Feed' }];
      mockRepository.find.mockResolvedValue(mockItems);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });

    it('should filter by farmId', async () => {
      const farmId = 'farm-1';
      await service.findAll(farmId);

      expect(mockRepository.find).toHaveBeenCalledWith({ where: { farmId } });
    });

    it('should filter by category', async () => {
      const category = 'feed';
      await service.findAll(undefined, category);

      expect(mockRepository.find).toHaveBeenCalledWith({ where: { category } });
    });
  });

  describe('findOne', () => {
    it('should return an inventory item by id', async () => {
      const itemId = 'item-1';
      const mockItem = { id: itemId, name: 'Fish Feed' };
      mockRepository.findOneBy.mockResolvedValue(mockItem);

      const result = await service.findOne(itemId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: itemId });
      expect(result).toEqual(mockItem);
    });
  });

  describe('update', () => {
    it('should update an inventory item', async () => {
      const itemId = 'item-1';
      const updateDto = { quantity: 150 };
      const updatedItem = { id: itemId, name: 'Fish Feed', quantity: 150 };

      mockRepository.findOneBy.mockResolvedValue(updatedItem);

      const result = await service.update(itemId, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(itemId, updateDto);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: itemId });
      expect(result).toEqual(updatedItem);
    });
  });

  describe('remove', () => {
    it('should remove an inventory item', async () => {
      const itemId = 'item-1';
      const result = await service.remove(itemId);

      expect(mockRepository.delete).toHaveBeenCalledWith(itemId);
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('getLowStock', () => {
    it('should return low stock items for a farm', async () => {
      const farmId = 'farm-1';
      const mockLowStockItems = [{ id: '1', name: 'Fish Feed', quantity: 5, reorderLevel: 20 }];

      mockRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLowStockItems),
      });

      const result = await service.getLowStock(farmId);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('item');
      expect(result).toEqual(mockLowStockItems);
    });
  });
  describe('adjustStock', () => {
    it('should adjust stock level correctly', async () => {
      const itemId = 'item-1';
      const initialQuantity = 100;
      const adjustment = -20;
      const mockItem = { id: itemId, name: 'Fish Feed', quantity: initialQuantity };

      mockRepository.findOneBy.mockResolvedValue(mockItem);
      mockRepository.save.mockImplementation((item) => Promise.resolve(item));

      const result = await service.adjustStock(itemId, adjustment);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: itemId });
      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: itemId,
        quantity: initialQuantity + adjustment
      }));
      expect(result.quantity).toBe(initialQuantity + adjustment);
    });

    it('should throw error if item not found', async () => {
      const itemId = 'non-existent';
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.adjustStock(itemId, 10)).rejects.toThrow('Inventory item not found');
    });

    it('should throw error if insufficient stock', async () => {
      const itemId = 'item-1';
      const mockItem = { id: itemId, name: 'Fish Feed', quantity: 10 };
      mockRepository.findOneBy.mockResolvedValue(mockItem);

      await expect(service.adjustStock(itemId, -20)).rejects.toThrow('Insufficient stock');
    });
  });
});
