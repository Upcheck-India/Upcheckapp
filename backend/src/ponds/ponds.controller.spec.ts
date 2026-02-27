import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PondsController } from './ponds.controller';
import { PondsService } from './ponds.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('PondsController', () => {
  let controller: PondsController;
  let service: any;

  const mockUser = { id: 'user-1' };
  const mockPond = { id: 'pond-1', name: 'A01', farmId: 'farm-1' };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ pond: mockPond, calculatedAreaM2: 200, warnings: [] }),
      findAll: jest.fn().mockResolvedValue({ ponds: [mockPond], total: 1, page: 1, hasMore: false }),
      findOne: jest.fn().mockResolvedValue(mockPond),
      update: jest.fn().mockResolvedValue(mockPond),
      archive: jest.fn().mockResolvedValue({ message: 'Pond archived successfully' }),
      remove: jest.fn().mockResolvedValue({ message: 'Pond deleted successfully' }),
      getDimensionHistory: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PondsController],
      providers: [
        { provide: DataSource, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        { provide: PondsService, useValue: service },
      ],
    }).compile();

    controller = module.get<PondsController>(PondsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /ponds', () => {
    it('should create pond with user id from JWT', async () => {
      const dto = {
        farmId: 'farm-1', namePrefix: 'A', geometryType: 'rectangular',
        constructionType: 'earthen', lengthM: 20, widthM: 10, depthM: 1.5,
      };
      const result = await controller.create(dto as any, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toHaveProperty('pond');
    });
  });

  describe('GET /ponds', () => {
    it('should throw BadRequestException when farmId missing', () => {
      expect(() => controller.findAll(
        undefined as any, undefined as any, undefined as any, undefined as any, undefined as any, mockUser, undefined as any
      )).toThrow(BadRequestException);
    });

    it('should pass filters to service', async () => {
      const pageOptions: any = { page: 2, take: 10 };
      await controller.findAll('farm-1', 'active', 'vannamei', 'name', 'false', mockUser, pageOptions);
      expect(service.findAll).toHaveBeenCalledWith('farm-1', 'user-1', {
        status: 'active', search: 'vannamei', sort: 'name', includeArchived: false,
      }, pageOptions);
    });
  });

  describe('GET /ponds/:id', () => {
    it('should return specific pond', async () => {
      const result = await controller.findOne('pond-1', mockUser);
      expect(result).toEqual(mockPond);
    });
  });

  describe('PATCH /ponds/:id', () => {
    it('should update pond', async () => {
      const dto = { lengthM: 25 };
      await controller.update('pond-1', dto as any, mockUser);
      expect(service.update).toHaveBeenCalledWith('pond-1', dto, 'user-1');
    });
  });

  describe('PATCH /ponds/:id/archive', () => {
    it('should archive pond', async () => {
      const result = await controller.archive('pond-1', mockUser);
      expect(result.message).toContain('archived');
    });

    it('should propagate ConflictException for active cycle', async () => {
      service.archive.mockRejectedValue(new ConflictException());
      await expect(controller.archive('pond-1', mockUser)).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /ponds/:id', () => {
    it('should delete pond', async () => {
      const result = await controller.remove('pond-1', mockUser);
      expect(result.message).toContain('deleted');
    });
  });

  describe('GET /ponds/:id/dimension-history', () => {
    it('should return dimension history', async () => {
      const pageOptions: any = { page: 1, take: 10 };
      const result = await controller.getDimensionHistory('pond-1', mockUser, pageOptions);
      expect(service.getDimensionHistory).toHaveBeenCalledWith('pond-1', 'user-1', pageOptions);
    });
  });
});
