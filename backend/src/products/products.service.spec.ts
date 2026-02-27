import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

// Mock repository factory
const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'test-id' })),
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let mockRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    mockRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto = {
        name: 'Aquatic Feed',
        category: 'feed',
        description: 'High protein fish feed',
        price: 50,
        stock: 100,
        unit: 'kg'
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(createDto));
    });
  });

  describe('findAll', () => {
    it('should return all active products', async () => {
      const mockProducts = [{ id: '1', name: 'Aquatic Feed' }];
      mockRepository.find.mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(result).toEqual(mockProducts);
    });

    it('should filter by category', async () => {
      const category = 'medicine';
      await service.findAll(category);

      expect(mockRepository.find).toHaveBeenCalledWith({ 
        where: { isActive: true, category } 
      });
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const productId = 'prod-1';
      const mockProduct = { id: productId, name: 'Aquatic Feed' };
      mockRepository.findOneBy.mockResolvedValue(mockProduct);

      const result = await service.findOne(productId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: productId });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const productId = 'prod-1';
      const updateDto = { price: 55 };
      const updatedProduct = { id: productId, name: 'Aquatic Feed', price: 55 };
      
      mockRepository.findOneBy.mockResolvedValue(updatedProduct);

      const result = await service.update(productId, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(productId, updateDto);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: productId });
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      const productId = 'prod-1';
      const result = await service.remove(productId);

      expect(mockRepository.delete).toHaveBeenCalledWith(productId);
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('updateStock', () => {
    it('should update product stock', async () => {
      const productId = 'prod-1';
      const newStock = 150;
      const updatedProduct = { id: productId, name: 'Aquatic Feed', stock: newStock };
      
      mockRepository.findOneBy.mockResolvedValue(updatedProduct);

      const result = await service.updateStock(productId, newStock);

      expect(mockRepository.update).toHaveBeenCalledWith(productId, { stock: newStock });
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: productId });
      expect(result).toEqual(updatedProduct);
    });
  });
});
