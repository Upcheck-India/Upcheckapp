import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminDirectoryService } from './admin-directory.service';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { FarmMember } from '../farm-access/farm-member.entity';
import { Pond } from '../ponds/pond.entity';
import { Crop } from '../crops/crop.entity';

function repoMock() {
  return { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
}

describe('AdminDirectoryService', () => {
  let service: AdminDirectoryService;
  let usersRepo: ReturnType<typeof repoMock>;
  let farmsRepo: ReturnType<typeof repoMock>;
  let membersRepo: ReturnType<typeof repoMock>;
  let pondsRepo: ReturnType<typeof repoMock>;
  let cropsRepo: ReturnType<typeof repoMock>;
  let query: jest.Mock;

  beforeEach(async () => {
    usersRepo = repoMock();
    farmsRepo = repoMock();
    membersRepo = repoMock();
    pondsRepo = repoMock();
    cropsRepo = repoMock();
    query = jest.fn().mockResolvedValue([{ count: '0' }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDirectoryService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Farm), useValue: farmsRepo },
        { provide: getRepositoryToken(FarmMember), useValue: membersRepo },
        { provide: getRepositoryToken(Pond), useValue: pondsRepo },
        { provide: getRepositoryToken(Crop), useValue: cropsRepo },
        { provide: DataSource, useValue: { query } },
      ],
    }).compile();
    service = module.get(AdminDirectoryService);
  });

  describe('searchUsers', () => {
    it('looks up by exact id with a scoped select', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      const result = await service.searchUsers({ id: 'u1' });
      expect(result).toEqual([{ id: 'u1', email: 'a@b.com' }]);
      expect(usersRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          select: expect.objectContaining({ id: true, email: true }),
        }),
      );
      // Never a push token, TOTP secret or password hash in the select.
      const select = usersRepo.findOne.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('pushToken');
      expect(select).not.toHaveProperty('totpSecret');
      expect(select).not.toHaveProperty('passwordHash');
    });

    it('canonicalizes a phone before matching it', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await service.searchUsers({ phone: '+91 98765-43210' });
      expect(usersRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { phone: '919876543210' } }),
      );
    });

    it('returns nothing when no query field is given', async () => {
      await expect(service.searchUsers({})).resolves.toEqual([]);
      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('404s an unknown user', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.getUser('nope')).rejects.toThrow(NotFoundException);
    });

    it('joins farm membership onto the user', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      membersRepo.find.mockResolvedValue([{ farmId: 'f1', role: 'owner', status: 'active' }]);
      farmsRepo.find.mockResolvedValue([{ id: 'f1', name: 'Nellore Farm' }]);

      const result = await service.getUser('u1');
      expect(result.farms).toEqual([
        { farmId: 'f1', farmName: 'Nellore Farm', role: 'owner', status: 'active' },
      ]);
    });
  });

  describe('searchFarms', () => {
    it('requires the DTO\'s own min-length prefix (enforced by class-validator upstream)', async () => {
      farmsRepo.find.mockResolvedValue([{ id: 'f1', name: 'Nellore Farm' }]);
      const result = await service.searchFarms({ name: 'Nel' });
      expect(result).toEqual([{ id: 'f1', name: 'Nellore Farm' }]);
    });
  });

  describe('getFarm', () => {
    it('404s an unknown farm', async () => {
      farmsRepo.findOne.mockResolvedValue(null);
      await expect(service.getFarm('nope')).rejects.toThrow(NotFoundException);
    });

    it('assembles owner, members, ponds, cycles and recent activity', async () => {
      farmsRepo.findOne.mockResolvedValue({ id: 'f1', name: 'Nellore Farm', userId: 'owner-1' });
      usersRepo.findOne.mockResolvedValue({ id: 'owner-1', email: 'owner@x.com' });
      membersRepo.find.mockResolvedValue([{ userId: 'owner-1', role: 'owner', status: 'active' }]);
      usersRepo.find.mockResolvedValue([{ id: 'owner-1', email: 'owner@x.com' }]);
      pondsRepo.find.mockResolvedValue([{ id: 'p1', name: 'Pond 1', status: 'active' }]);
      cropsRepo.find.mockResolvedValue([{ id: 'c1', name: 'Crop 1', status: 'active' }]);
      query.mockResolvedValue([{ count: '12' }]);

      const result = await service.getFarm('f1');
      expect(result.owner).toEqual({ id: 'owner-1', email: 'owner@x.com' });
      expect(result.members).toEqual([
        { id: 'owner-1', email: 'owner@x.com', userId: 'owner-1', role: 'owner', status: 'active' },
      ]);
      expect(result.ponds).toEqual([{ id: 'p1', name: 'Pond 1', status: 'active' }]);
      expect(result.recentActivity).toEqual({ measurementsLast30d: 12 });
    });

    it('degrades activity count to null instead of failing when measurements is missing', async () => {
      farmsRepo.findOne.mockResolvedValue({ id: 'f1', name: 'Nellore Farm', userId: 'owner-1' });
      usersRepo.findOne.mockResolvedValue({ id: 'owner-1' });
      query.mockRejectedValue(
        Object.assign(new Error('relation does not exist'), { code: '42P01' }),
      );

      const result = await service.getFarm('f1');
      expect(result.recentActivity).toEqual({ measurementsLast30d: null });
    });
  });
});
