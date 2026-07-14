import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FarmMembersService } from './farm-members.service';
import { FarmMember } from '../farm-access/farm-member.entity';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';

describe('FarmMembersService.joinFarm', () => {
  let service: FarmMembersService;
  let membersRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let farmsRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    membersRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    };
    farmsRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmMembersService,
        { provide: getRepositoryToken(FarmMember), useValue: membersRepo },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Farm), useValue: farmsRepo },
        {
          provide: FarmAccessService,
          useValue: { assertCanAccessFarm: jest.fn(), getRoleOnFarm: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(FarmMembersService);
  });

  it('throws NotFoundException when no farm matches the code', async () => {
    farmsRepo.findOne.mockResolvedValue(null);
    await expect(
      service.joinFarm('user-1', { code: 'ABCD2345' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the caller already owns the farm', async () => {
    farmsRepo.findOne.mockResolvedValue({ id: 'farm-1', userId: 'user-1' });
    await expect(
      service.joinFarm('user-1', { code: 'ABCD2345' }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when the caller is already a member', async () => {
    farmsRepo.findOne.mockResolvedValue({ id: 'farm-1', userId: 'owner-1' });
    membersRepo.findOne.mockResolvedValue({ id: 'm1', farmId: 'farm-1', userId: 'user-1' });
    await expect(
      service.joinFarm('user-1', { code: 'ABCD2345' }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a worker membership row for a fresh join', async () => {
    farmsRepo.findOne.mockResolvedValue({ id: 'farm-1', userId: 'owner-1', name: 'Test Farm' });
    membersRepo.findOne.mockResolvedValue(null);

    const result = await service.joinFarm('user-1', { code: 'ABCD2345' });

    expect(membersRepo.create).toHaveBeenCalledWith({
      farmId: 'farm-1',
      userId: 'user-1',
      role: 'worker',
      addedById: null,
    });
    expect(membersRepo.save).toHaveBeenCalled();
    expect(result).toEqual({
      farmId: 'farm-1',
      role: 'worker',
      farm: { id: 'farm-1', name: 'Test Farm' },
    });
  });
});
