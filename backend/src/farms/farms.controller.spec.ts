import { Test, TestingModule } from '@nestjs/testing';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('FarmsController', () => {
  let controller: FarmsController;
  let service: any;

  const mockUser = { id: 'user-1' };
  const mockReq = { user: mockUser };
  const mockFarm = { id: 'farm-1', userId: 'user-1', name: 'Test Farm', farmCode: 'TF001234' };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(mockFarm),
      findAll: jest.fn().mockResolvedValue([mockFarm]),
      findOne: jest.fn().mockResolvedValue(mockFarm),
      update: jest.fn().mockResolvedValue({ ...mockFarm, name: 'Updated' }),
      remove: jest.fn().mockResolvedValue({ message: 'Farm archived successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FarmsController],
      providers: [{ provide: FarmsService, useValue: service }],
    }).compile();

    controller = module.get<FarmsController>(FarmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /farms', () => {
    it('should create farm with user id from JWT', async () => {
      const dto = { name: 'New Farm' };
      const result = await controller.create(dto as any, mockReq);
      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(mockFarm);
    });
  });

  describe('GET /farms', () => {
    it('should return all farms for authenticated user', async () => {
      const result = await controller.findAll(mockReq);
      expect(service.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockFarm]);
    });
  });

  describe('GET /farms/:id', () => {
    it('should return specific farm', async () => {
      const result = await controller.findOne('farm-1', mockReq);
      expect(result).toEqual(mockFarm);
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('bad-id', mockReq)).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException', async () => {
      service.findOne.mockRejectedValue(new ForbiddenException());
      await expect(controller.findOne('farm-1', { user: { id: 'user-2' } })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PATCH /farms/:id', () => {
    it('should update farm', async () => {
      const result = await controller.update('farm-1', { name: 'Updated' } as any, mockReq);
      expect(service.update).toHaveBeenCalledWith('farm-1', { name: 'Updated' }, 'user-1');
    });
  });

  describe('DELETE /farms/:id', () => {
    it('should soft-delete farm', async () => {
      const result = await controller.remove('farm-1', mockReq);
      expect(result.message).toContain('archived');
    });
  });
});
