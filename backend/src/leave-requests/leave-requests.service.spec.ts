import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequest } from './leave-request.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';

describe('LeaveRequestsService', () => {
  let service: LeaveRequestsService;
  let leaveRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let farmAccess: { assertCanAccessFarm: jest.Mock };

  beforeEach(async () => {
    leaveRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    farmAccess = { assertCanAccessFarm: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveRequestsService,
        { provide: getRepositoryToken(LeaveRequest), useValue: leaveRepo },
        { provide: FarmAccessService, useValue: farmAccess },
      ],
    }).compile();

    service = module.get(LeaveRequestsService);
  });

  describe('create', () => {
    it('creates a pending request for the caller, gated on WRITE_OPERATIONAL', async () => {
      leaveRepo.findOne.mockResolvedValue(null);

      const result = await service.create('worker-1', {
        id: 'req-1', farmId: 'farm-1', startDate: '2026-08-01', endDate: '2026-08-03', reason: 'Family event',
      });

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('worker-1', 'farm-1', 'WRITE_OPERATIONAL');
      expect(leaveRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        id: 'req-1', farmId: 'farm-1', userId: 'worker-1', status: 'pending',
      }));
      expect(result).toEqual(expect.objectContaining({ status: 'pending' }));
    });

    it('rejects endDate before startDate', async () => {
      leaveRepo.findOne.mockResolvedValue(null);

      await expect(service.create('worker-1', {
        farmId: 'farm-1', startDate: '2026-08-05', endDate: '2026-08-01',
      })).rejects.toThrow(BadRequestException);
    });

    it('is idempotent on the client-minted id (offline replay)', async () => {
      const existing = { id: 'req-1', farmId: 'farm-1', userId: 'worker-1', status: 'pending' };
      leaveRepo.findOne.mockResolvedValue(existing);

      const result = await service.create('worker-1', {
        id: 'req-1', farmId: 'farm-1', startDate: '2026-08-01', endDate: '2026-08-03',
      });

      expect(leaveRepo.create).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });
  });

  describe('findMine / findAllForFarm', () => {
    it('findMine scopes to the caller\'s own requests', async () => {
      leaveRepo.find.mockResolvedValue([]);
      await service.findMine('worker-1', 'farm-1');
      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('worker-1', 'farm-1', 'READ');
      expect(leaveRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { farmId: 'farm-1', userId: 'worker-1' } }),
      );
    });

    it('findAllForFarm requires WRITE_MANAGEMENT', async () => {
      leaveRepo.find.mockResolvedValue([]);
      await service.findAllForFarm('manager-1', 'farm-1', 'pending');
      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('manager-1', 'farm-1', 'WRITE_MANAGEMENT');
      expect(leaveRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { farmId: 'farm-1', status: 'pending' } }),
      );
    });

    it('degrades to an empty array when the table is missing (42P01)', async () => {
      leaveRepo.find.mockRejectedValue({ code: '42P01' });
      const result = await service.findMine('worker-1', 'farm-1');
      expect(result).toEqual([]);
    });
  });

  describe('decide', () => {
    it('throws NotFoundException for a missing request', async () => {
      leaveRepo.findOne.mockResolvedValue(null);
      await expect(service.decide('manager-1', 'req-1', 'approved')).rejects.toThrow(NotFoundException);
    });

    it('approves a pending request, gated on WRITE_MANAGEMENT', async () => {
      leaveRepo.findOne.mockResolvedValue({ id: 'req-1', farmId: 'farm-1', userId: 'worker-1', status: 'pending' });

      const result = await service.decide('manager-1', 'req-1', 'approved');

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('manager-1', 'farm-1', 'WRITE_MANAGEMENT');
      expect(result.status).toBe('approved');
      expect(result.decidedById).toBe('manager-1');
      expect(result.decidedAt).toBeInstanceOf(Date);
    });

    it('rejects re-deciding an already-decided request', async () => {
      leaveRepo.findOne.mockResolvedValue({ id: 'req-1', farmId: 'farm-1', userId: 'worker-1', status: 'approved' });

      await expect(service.decide('manager-1', 'req-1', 'rejected')).rejects.toThrow(ConflictException);
    });
  });
});
