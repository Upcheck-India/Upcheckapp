import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FarmMembersService } from './farm-members.service';
import { FarmMember } from '../farm-access/farm-member.entity';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { Pond } from '../ponds/pond.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { AvatarService } from '../avatars/avatar.service';

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
  let usersRepo: { findOne: jest.Mock; find?: jest.Mock };
  let membersRepo: { findOne: jest.Mock; find?: jest.Mock; create?: jest.Mock; save?: jest.Mock };
  let farmsRepo: { findOne: jest.Mock };
  let farmAccess: Record<string, jest.Mock>;
  let avatars: { resolve: jest.Mock };

  const PUBLIC_USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
  };

  beforeEach(async () => {
    usersRepo = { findOne: jest.fn() };
    membersRepo = { findOne: jest.fn() };
    farmsRepo = { findOne: jest.fn() };
    avatars = { resolve: jest.fn().mockResolvedValue(new Map()) };
    farmAccess = {
      // listMembers batches pond scopes for the roster.
      getPondScopesForMembers: jest.fn().mockResolvedValue(new Map()),
      assertCanAccessFarm: jest.fn().mockResolvedValue(undefined),
      getRoleOnFarm: jest.fn().mockResolvedValue('owner'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmMembersService,
        { provide: getRepositoryToken(FarmMember), useValue: membersRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Farm), useValue: farmsRepo },
        { provide: getRepositoryToken(Pond), useValue: { find: jest.fn() } },
        { provide: FarmAccessService, useValue: farmAccess },
        { provide: AvatarService, useValue: avatars },
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

  /**
   * Live-incident regression: listMembers() used `relations: ['user']` — an
   * eager join selects every column of the joined User entity with no way
   * to scope it, same underlying issue as the bare findOne() calls above,
   * just via a different TypeORM API. The failure was worse here: caught by
   * the screen's try/catch and silently rendered as "no workers" instead of
   * a visible error, right after a successful "Add Worker" success message.
   */
  it('listMembers never uses relations:["user"] and scopes the batched user select', async () => {
    membersRepo.find = jest.fn().mockResolvedValue([
      { id: 'm1', farmId: 'farm-1', userId: 'u1', role: 'worker', createdAt: new Date() },
    ]);
    usersRepo.find = jest.fn().mockResolvedValue([
      { id: 'u1', firstName: 'A', lastName: 'B', username: 'ab', avatarUrl: null },
    ]);

    const result = await service.listMembers('farm-1', 'owner-1');

    expect(membersRepo.find).toHaveBeenCalledWith(
      expect.not.objectContaining({ relations: expect.anything() }),
    );
    expect(usersRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ select: PUBLIC_USER_SELECT }),
    );
    expect(result[0].user).toEqual({
      id: 'u1', firstName: 'A', lastName: 'B', username: 'ab', avatarUrl: null, avatarThumbUrl: null,
    });
  });

  it('listMembers asks AvatarService (viewer + this farm) for the roster in one batch', async () => {
    membersRepo.find = jest.fn().mockResolvedValue([
      { id: 'm1', farmId: 'farm-1', userId: 'u1', role: 'worker', createdAt: new Date() },
      { id: 'm2', farmId: 'farm-1', userId: 'u2', role: 'worker', createdAt: new Date() },
    ]);
    usersRepo.find = jest.fn().mockResolvedValue([
      { id: 'u1', firstName: 'A', lastName: 'B', username: 'ab' },
      { id: 'u2', firstName: 'C', lastName: 'D', username: 'cd' },
    ]);
    avatars.resolve.mockResolvedValue(
      new Map([
        ['u1', { avatarUrl: 'https://r2/u1.webp?sig', avatarThumbUrl: 'https://r2/u1.thumb.webp?sig' }],
        ['u2', { avatarUrl: null, avatarThumbUrl: null }],
      ]),
    );

    const result = await service.listMembers('farm-1', 'viewer-1');

    expect(avatars.resolve).toHaveBeenCalledTimes(1);
    expect(avatars.resolve).toHaveBeenCalledWith('viewer-1', ['farm-1'], ['u1', 'u2']);
    expect(result[0].user).toMatchObject({ avatarThumbUrl: 'https://r2/u1.thumb.webp?sig' });
    expect(result[1].user).toMatchObject({ avatarUrl: null, avatarThumbUrl: null });
  });

  it('lookupUser (someone not yet on the farm) never returns a picture', async () => {
    usersRepo.findOne.mockResolvedValue({
      id: 'u9', firstName: 'X', lastName: 'Y', username: 'xy', avatarUrl: 'https://lh3.googleusercontent.com/a/p',
    });
    const user = await service.lookupUser({ userId: 'u9' });
    expect(user.avatarUrl).toBeNull();
    expect(user.avatarThumbUrl).toBeNull();
  });

  it('listMembers does not query users at all when the farm has no members', async () => {
    membersRepo.find = jest.fn().mockResolvedValue([]);
    usersRepo.find = jest.fn();

    const result = await service.listMembers('farm-1', 'owner-1');

    expect(usersRepo.find).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
