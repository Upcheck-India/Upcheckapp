import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FarmMembersService } from './farm-members.service';
import { FarmMember } from '../farm-access/farm-member.entity';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';

/**
 * Live-incident regression: "Add Worker" 500'd because every usersRepo
 * lookup in this service used a bare findOne(), which selects EVERY mapped
 * User column by default — including backup_codes, added by a migration
 * that was written but never applied in production (the same root cause
 * that took down login once already). Scoping the select to only the
 * fields toPublicUser() actually reads means this code never depends on
 * whether the rest of User's columns are migrated yet.
 */
describe('FarmMembersService — user lookups never select unused columns', () => {
  let service: FarmMembersService;
  let usersRepo: { findOne: jest.Mock };
  let membersRepo: { findOne: jest.Mock };
  let farmsRepo: { findOne: jest.Mock };
  let farmAccess: { assertCanAccessFarm: jest.Mock; getRoleOnFarm: jest.Mock };

  const PUBLIC_USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    avatarUrl: true,
  };

  beforeEach(async () => {
    usersRepo = { findOne: jest.fn() };
    membersRepo = { findOne: jest.fn() };
    farmsRepo = { findOne: jest.fn() };
    farmAccess = {
      assertCanAccessFarm: jest.fn().mockResolvedValue(undefined),
      getRoleOnFarm: jest.fn().mockResolvedValue('owner'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmMembersService,
        { provide: getRepositoryToken(FarmMember), useValue: membersRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Farm), useValue: farmsRepo },
        { provide: FarmAccessService, useValue: farmAccess },
      ],
    }).compile();

    service = module.get(FarmMembersService);
  });

  it('lookupUser scopes the select when resolving by userId', async () => {
    usersRepo.findOne.mockResolvedValue({
      id: 'u1', firstName: 'A', lastName: 'B', username: 'ab', avatarUrl: null,
    });
    await service.lookupUser({ userId: 'u1' });
    expect(usersRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: PUBLIC_USER_SELECT,
    });
  });

  it('lookupUser scopes the select when resolving by phone', async () => {
    usersRepo.findOne.mockResolvedValue({
      id: 'u1', firstName: 'A', lastName: 'B', username: 'ab', avatarUrl: null,
    });
    await service.lookupUser({ phone: '+911234567890' });
    expect(usersRepo.findOne).toHaveBeenCalledWith({
      where: { phone: '+911234567890' },
      select: PUBLIC_USER_SELECT,
    });
  });

  it('lookupUser scopes the select when resolving by email', async () => {
    usersRepo.findOne.mockResolvedValue({
      id: 'u1', firstName: 'A', lastName: 'B', username: 'ab', avatarUrl: null,
    });
    await service.lookupUser({ email: 'a@b.com' });
    expect(usersRepo.findOne).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
      select: PUBLIC_USER_SELECT,
    });
  });

  it('addMember scopes the select for the target user lookup', async () => {
    usersRepo.findOne.mockResolvedValue({
      id: 'u2', firstName: 'C', lastName: 'D', username: 'cd', avatarUrl: null,
    });
    farmsRepo.findOne.mockResolvedValue({ id: 'farm-1', userId: 'owner-1' });
    membersRepo.findOne.mockResolvedValue(null);
    membersRepo.create = jest.fn((x) => x);
    membersRepo.save = jest.fn().mockResolvedValue(undefined);

    await service.addMember('farm-1', 'owner-1', { userId: 'u2' });

    expect(usersRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'u2' },
      select: PUBLIC_USER_SELECT,
    });
  });
});
