import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
import { FarmsService } from './farms.service';
import { Farm } from './farm.entity';
import { FarmMember } from '../farm-access/farm-member.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { PhotoDeletionService } from '../storage/photo-deletion.service';
import {
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

describe('FarmsService', () => {
  let service: FarmsService;
  let farmAccess: FarmAccessService;
  let repository: any;
  let cropsRepo: any;
  let module: TestingModule;
  let txManager: { update: jest.Mock };
  let photoDeletions: { enqueue: jest.Mock };

  const mockFarm: Partial<Farm> = {
    id: 'farm-1',
    userId: 'user-1',
    name: 'Test Farm',
    farmCode: 'TF001234',
    areaHectares: 10.5,
    address: 'Test Address',
    longitude: 80.123,
    latitude: 13.456,
    waterSourceType: 'tidal',
    qrCodeUrl: '',
    privacySetting: 'private',
    deletedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      // D4 caa_registration_no is raw SQL, not an entity column.
      query: jest.fn().mockResolvedValue([]),
    };
    cropsRepo = { count: jest.fn().mockResolvedValue(0) };
    // remove() reaches the crops table through the farm repository's manager,
    // so it needs no extra constructor dependency.
    txManager = { update: jest.fn().mockResolvedValue(undefined) };
    repository.manager = {
      getRepository: jest.fn(() => cropsRepo),
      transaction: jest.fn(async (cb: (m: any) => unknown) => cb(txManager)),
    };
    photoDeletions = { enqueue: jest.fn().mockResolvedValue(true) };

    module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://dummy.com') },
        },
        FarmsService,
        { provide: getRepositoryToken(Farm), useValue: repository },
        // create() now also writes the owner's farm_members row, so the owner
        // is visible to the roster rather than existing only as farm.userId.
        {
          provide: getRepositoryToken(FarmMember),
          useValue: { insert: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: FarmAccessService,
          useValue: {
            getAccessibleFarmIds: jest.fn().mockResolvedValue(['farm-1']),
            assertCanAccessFarm: jest.fn().mockResolvedValue(mockFarm),
            getRoleOnFarm: jest.fn().mockResolvedValue('owner'),
            getMembershipsOnFarms: jest.fn(
              async (_u: string, ids: string[]) =>
                new Map(ids.map((id) => [id, { role: 'owner', overrides: null, policy: null }])),
            ),
          },
        },
        { provide: PhotoDeletionService, useValue: photoDeletions },
      ],
    }).compile();

    service = module.get<FarmsService>(FarmsService);
    farmAccess = module.get<FarmAccessService>(FarmAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create farm with auto-generated farm code', async () => {
      repository.findOneBy.mockResolvedValue(null); // No collision
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);

      const result = await service.create({ name: 'New Farm' }, 'user-1');
      expect(result).toEqual({ ...mockFarm, stateCode: null, districtCode: null });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Farm',
          userId: 'user-1',
        }),
      );
    });

    it('ignores a client-supplied farm code and generates one server-side', async () => {
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);
      repository.findOneBy.mockResolvedValue(null); // no collision

      // `farmCode` is no longer on CreateFarmDto; the global ValidationPipe
      // strips it in production. Cast here to prove the service ignores it even
      // if one reaches it another way.
      await service.create(
        { name: 'Farm', farmCode: 'CUSTOM01' } as any,
        'user-1',
      );

      const created = repository.create.mock.calls[0][0];
      expect(created.farmCode).not.toBe('CUSTOM01');
      expect(created.farmCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    });

    it('gives the owner a farm_members row, not just farm.userId', async () => {
      // The reported symptom was "1 of 0 checked in today" for an owner who
      // had just checked in. Ownership lived only in farm.userId, so the owner
      // was invisible to listMembers — the denominator counted members and the
      // owner was not one of them.
      repository.findOneBy.mockResolvedValue(null);
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);
      const membersRepo = module.get(getRepositoryToken(FarmMember));

      await service.create({ name: 'New Farm' }, 'user-1');

      expect(membersRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          farmId: 'farm-1',
          userId: 'user-1',
          role: 'owner',
          status: 'active',
        }),
      );
    });

    it('still returns the farm if the membership write fails', async () => {
      // Authorization does not depend on this row — the owner fast-path is
      // untouched — so a failure here must not fail farm creation.
      repository.findOneBy.mockResolvedValue(null);
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);
      const membersRepo = module.get(getRepositoryToken(FarmMember));
      membersRepo.insert.mockRejectedValueOnce(new Error('duplicate key'));

      await expect(service.create({ name: 'New Farm' }, 'user-1')).resolves.toEqual(
        { ...mockFarm, stateCode: null, districtCode: null },
      );
    });

    // C0.2 (spec 2026-09-20 compliance): a farm saves with district and no
    // coordinates.
    it('saves district with no coordinates', async () => {
      repository.findOneBy.mockResolvedValue(null);
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);

      const result = await service.create(
        { name: 'Farm', stateCode: 'AP', districtCode: 'AP-KRISHNA' } as any,
        'user-1',
      );

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE farms SET state_code'),
        ['farm-1', 'AP'],
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE farms SET district_code'),
        ['farm-1', 'AP-KRISHNA'],
      );
      expect(result.stateCode).toBe('AP');
      expect(result.districtCode).toBe('AP-KRISHNA');
      expect((repository.create.mock.calls[0][0] as any).longitude).toBeUndefined();
      expect((repository.create.mock.calls[0][0] as any).latitude).toBeUndefined();
    });

    it('does not fail farm creation when the district column is unmigrated', async () => {
      repository.findOneBy.mockResolvedValue(null);
      repository.create.mockReturnValue(mockFarm);
      repository.save.mockResolvedValue(mockFarm);
      repository.query.mockRejectedValue(Object.assign(new Error('no column'), { code: '42703' }));

      const result = await service.create(
        { name: 'Farm', stateCode: 'AP', districtCode: 'AP-KRISHNA' } as any,
        'user-1',
      );
      expect(result.stateCode).toBeNull();
      expect(result.districtCode).toBeNull();
    });

    it('throws rather than returning a colliding code after 10 attempts', async () => {
      // Every generated candidate already exists.
      repository.findOneBy.mockResolvedValue(mockFarm);

      await expect(service.create({ name: 'Farm' }, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(repository.findOneBy).toHaveBeenCalledTimes(10);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all accessible farms for user', async () => {
      repository.find.mockResolvedValue([mockFarm]);
      const result = await service.findAll('user-1');
      expect(result).toEqual([mockFarm]);
      // Now scoped to the farm ids the user can access (owner or worker),
      // and archived farms are excluded unless asked for.
      expect(repository.find).toHaveBeenCalledWith({
        where: { id: In(['farm-1']), archivedAt: IsNull() },
      });
    });

    it('includes archived farms only when the flag is set', async () => {
      repository.find.mockResolvedValue([mockFarm]);
      await service.findAll('user-1', true);
      expect(repository.find).toHaveBeenCalledWith({
        where: { id: In(['farm-1']) },
      });
    });

    /**
     * The regression this pins, and why the test above did not catch it.
     *
     * The archive filter is applied TWICE: once inside getAccessibleFarmIds,
     * which defaults to excluding archived farms, and once in the where-clause
     * here. `includeArchived` was threaded into the second but not the first,
     * so the id set arrived archive-free and the where-clause was choosing
     * between two archive-free sets. `?includeArchived=true` returned an empty
     * list every time, and the "include archived" toggle on the farms list
     * looked broken because it was.
     *
     * The test above asserts the where-clause and is blind to it. This one
     * asserts the ACCESS lookup, which is where the filter actually bit.
     */
    it('threads includeArchived into the access lookup, not just the where-clause', async () => {
      repository.find.mockResolvedValue([mockFarm]);
      const accessible = farmAccess.getAccessibleFarmIds as jest.Mock;

      await service.findAll('user-1', true);
      expect(accessible).toHaveBeenCalledWith('user-1', true);

      accessible.mockClear();
      await service.findAll('user-1');
      expect(accessible).toHaveBeenCalledWith('user-1', false);
    });
  });

  describe('findOwnedByUser', () => {
    it('should return only owned farms (strict, for economics)', async () => {
      repository.find.mockResolvedValue([mockFarm]);
      const result = await service.findOwnedByUser('user-1');
      expect(result).toEqual([mockFarm]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1', archivedAt: IsNull() },
      });
    });
  });

  describe('findOne', () => {
    it('should return farm', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      const result = await service.findOne('farm-1');
      expect(result).toEqual({
        ...mockFarm,
        caaRegistrationNo: null,
        stateCode: null,
        districtCode: null,
      });
    });

    // C0.2 (spec 2026-09-20 compliance): district is raw SQL, same D4 pattern
    // as caaRegistrationNo, so an unapplied 1780702300000 reads as null.
    it('carries the district (C0.2)', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.query.mockResolvedValue([{ stateCode: 'AP', districtCode: 'AP-KRISHNA' }]);
      const result = await service.findOne('farm-1');
      expect(result.stateCode).toBe('AP');
      expect(result.districtCode).toBe('AP-KRISHNA');
    });

    it('an unapplied district column (42703) reads as null, not a 500', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.query.mockRejectedValue(Object.assign(new Error('no column'), { code: '42703' }));
      const result = await service.findOne('farm-1');
      expect(result.stateCode).toBeNull();
      expect(result.districtCode).toBeNull();
    });

    // C0.2: coordinates are absent from a worker's or viewer's farm payload,
    // enforced server-side — not merely hidden by the UI.
    it('strips coordinates for a worker', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      (farmAccess.getRoleOnFarm as jest.Mock).mockResolvedValueOnce('worker');
      const result = await service.findOne('farm-1', 'worker-1');
      expect(result).not.toHaveProperty('latitude');
      expect(result).not.toHaveProperty('longitude');
    });

    it('strips coordinates for a viewer', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      (farmAccess.getRoleOnFarm as jest.Mock).mockResolvedValueOnce('viewer');
      const result = await service.findOne('farm-1', 'viewer-1');
      expect(result).not.toHaveProperty('latitude');
      expect(result).not.toHaveProperty('longitude');
    });

    it('keeps coordinates for the owner', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      (farmAccess.getRoleOnFarm as jest.Mock).mockResolvedValueOnce('owner');
      const result = await service.findOne('farm-1', 'user-1');
      expect(result.latitude).toBe(mockFarm.latitude);
      expect(result.longitude).toBe(mockFarm.longitude);
    });

    it('keeps coordinates for a manager', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      (farmAccess.getRoleOnFarm as jest.Mock).mockResolvedValueOnce('manager');
      const result = await service.findOne('farm-1', 'manager-1');
      expect(result.latitude).toBe(mockFarm.latitude);
    });

    it('carries the CAA registration number (D4)', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.query.mockResolvedValue([{ v: 'CAA/AP/123' }]);
      expect((await service.findOne('farm-1')).caaRegistrationNo).toBe('CAA/AP/123');
    });

    it('an unapplied CAA column (42703) reads as null, not a 500', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.query.mockRejectedValue(Object.assign(new Error('no column'), { code: '42703' }));
      expect((await service.findOne('farm-1')).caaRegistrationNo).toBeNull();
    });

    it('should throw NotFoundException when farm not found', async () => {
      repository.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for soft-deleted farm', async () => {
      repository.findOneBy.mockResolvedValue({
        ...mockFarm,
        deletedAt: new Date(),
      });
      await expect(service.findOne('farm-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update farm', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.update.mockResolvedValue(undefined);

      const result = await service.update('farm-1', { name: 'Updated' }, 'owner-1');
      expect(repository.update).toHaveBeenCalledWith('farm-1', {
        name: 'Updated',
      });
    });

    // The route lets managers in (MANAGE_WORKERS) for the shift; anything
    // else on the farm stays owner-only.
    it('lets a manager set only the shift fields without OWNER_ONLY', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      await service.update('farm-1', { shiftEndLocal: '18:00', shiftHours: 8 }, 'manager-1');
      expect(farmAccess.assertCanAccessFarm).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
    });

    it('asserts OWNER_ONLY when any non-shift field is present', async () => {
      (farmAccess.assertCanAccessFarm as jest.Mock).mockRejectedValueOnce(new ForbiddenException());
      await expect(
        service.update('farm-1', { shiftHours: 8, name: 'Mine now' }, 'manager-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('manager-1', 'farm-1', 'OWNER_ONLY');
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('CAA number is owner-only and written by raw SQL, not the entity', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      await service.update('farm-1', { caaRegistrationNo: ' CAA/AP/9 ' }, 'owner-1');
      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('owner-1', 'farm-1', 'OWNER_ONLY');
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE farms SET caa_registration_no'),
        ['farm-1', 'CAA/AP/9'],
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    // C0.2: "clear location" must persist an actual null, not merely omit
    // the field (buildDraft() on the frontend could not express this before).
    it('clears location by writing explicit nulls', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);
      repository.update.mockResolvedValue(undefined);

      await service.update(
        'farm-1',
        { stateCode: null, districtCode: null, latitude: null, longitude: null },
        'owner-1',
      );

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE farms SET state_code'),
        ['farm-1', null],
      );
      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE farms SET district_code'),
        ['farm-1', null],
      );
      expect(repository.update).toHaveBeenCalledWith(
        'farm-1',
        expect.objectContaining({ latitude: null, longitude: null }),
      );
    });

    it('a manager cannot set the district', async () => {
      (farmAccess.assertCanAccessFarm as jest.Mock).mockRejectedValueOnce(new ForbiddenException());
      await expect(
        service.update('farm-1', { stateCode: 'AP' }, 'manager-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.query).not.toHaveBeenCalled();
    });

    it('district edit fails loudly (503) when the migration has not run', async () => {
      repository.query.mockRejectedValue(Object.assign(new Error('no column'), { code: '42703' }));
      await expect(
        service.update('farm-1', { stateCode: 'AP' }, 'owner-1'),
      ).rejects.toThrow(/migration 1780702300000/);
    });

    it('a manager cannot set the CAA number', async () => {
      (farmAccess.assertCanAccessFarm as jest.Mock).mockRejectedValueOnce(new ForbiddenException());
      await expect(
        service.update('farm-1', { caaRegistrationNo: 'X' }, 'manager-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.query).not.toHaveBeenCalled();
    });
  });

  describe('UpdateFarmDto shift fields', () => {
    const errs = (body: object) =>
      validateSync(plainToInstance(UpdateFarmDto, body)).map((e) => e.property);

    it('accepts HH:MM, null, and 1–16 hours', () => {
      expect(errs({ shiftEndLocal: '18:00', shiftHours: 9 })).toEqual([]);
      expect(errs({ shiftEndLocal: '00:00', shiftHours: 1 })).toEqual([]);
      expect(errs({ shiftEndLocal: '23:59', shiftHours: 16 })).toEqual([]);
      expect(errs({ shiftEndLocal: null })).toEqual([]);
    });

    it('rejects bad times and out-of-range hours', () => {
      expect(errs({ shiftEndLocal: '24:00' })).toEqual(['shiftEndLocal']);
      expect(errs({ shiftEndLocal: '8:00' })).toEqual(['shiftEndLocal']);
      expect(errs({ shiftEndLocal: '18:00:00' })).toEqual(['shiftEndLocal']);
      expect(errs({ shiftHours: 0 })).toEqual(['shiftHours']);
      expect(errs({ shiftHours: 17 })).toEqual(['shiftHours']);
      expect(errs({ shiftHours: 8.5 })).toEqual(['shiftHours']);
    });
  });

  describe('Farm.shiftEndLocal column', () => {
    it("returns 'HH:MM' from Postgres 'HH:MM:SS'", () => {
      const { getMetadataArgsStorage } = require('typeorm');
      const col = getMetadataArgsStorage().columns.find(
        (c: any) => c.target === Farm && c.propertyName === 'shiftEndLocal',
      );
      expect(col.options.transformer.from('18:00:00')).toBe('18:00');
      expect(col.options.transformer.from(null)).toBeNull();
    });
  });

  describe('archive / unarchive', () => {
    it('archives a live farm', async () => {
      repository.update.mockResolvedValue(undefined);
      const result = await service.archive('farm-1', 'user-1');
      expect(repository.update).toHaveBeenCalledWith('farm-1', {
        archivedAt: expect.any(Date),
      });
      expect(result.message).toContain('archived');
    });

    it('asserts OWNER_ONLY before archiving', async () => {
      const access = module.get(FarmAccessService) as any;
      access.assertCanAccessFarm.mockRejectedValueOnce(new ForbiddenException());

      await expect(service.archive('farm-1', 'manager-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(access.assertCanAccessFarm).toHaveBeenCalledWith(
        'manager-1',
        'farm-1',
        'OWNER_ONLY',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('refuses to re-archive', async () => {
      const access = module.get(FarmAccessService) as any;
      access.assertCanAccessFarm.mockResolvedValueOnce({
        ...mockFarm,
        archivedAt: new Date(),
      });

      await expect(service.archive('farm-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('unarchives an archived farm', async () => {
      const access = module.get(FarmAccessService) as any;
      access.assertCanAccessFarm.mockResolvedValueOnce({
        ...mockFarm,
        archivedAt: new Date(),
      });
      repository.update.mockResolvedValue(undefined);

      await service.unarchive('farm-1', 'user-1');
      expect(repository.update).toHaveBeenCalledWith('farm-1', {
        archivedAt: null,
      });
    });

    it('asserts OWNER_ONLY before unarchiving', async () => {
      const access = module.get(FarmAccessService) as any;
      access.assertCanAccessFarm.mockRejectedValueOnce(new ForbiddenException());

      await expect(service.unarchive('farm-1', 'worker-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('refuses to unarchive a farm that is not archived', async () => {
      await expect(service.unarchive('farm-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete a farm with no crop history', async () => {
      repository.findOneBy.mockResolvedValue(mockFarm);

      const result = await service.remove('farm-1', 'user-1');
      expect(txManager.update).toHaveBeenCalledWith(
        Farm,
        'farm-1',
        expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      );
      expect(result.message).toContain('deleted');
    });

    it("F1: queues the farm's whole health/<farmId>/ prefix in the delete's transaction", async () => {
      const order: string[] = [];
      photoDeletions.enqueue.mockImplementation(async () => { order.push('enqueue'); return true; });
      txManager.update.mockImplementation(async () => { order.push('soft-delete'); });

      await service.remove('farm-1', 'user-1');

      expect(photoDeletions.enqueue).toHaveBeenCalledWith(
        [{ namespace: 'health', path: 'farm-1/' }],
        'farm_deleted',
        'user-1',
        txManager,
      );
      expect(order).toEqual(['enqueue', 'soft-delete']);
    });

    // Mirrors the pond rule: deleting a farm that has held crops takes the
    // production history with it. Archive is the action for a used farm.
    it('refuses to delete a farm whose ponds have crop history', async () => {
      cropsRepo.count.mockResolvedValue(3);

      await expect(service.remove('farm-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(txManager.update).not.toHaveBeenCalled();
      expect(photoDeletions.enqueue).not.toHaveBeenCalled();
    });

    it('asserts OWNER_ONLY before deleting', async () => {
      const access = module.get(FarmAccessService) as any;
      access.assertCanAccessFarm.mockRejectedValueOnce(new ForbiddenException());

      await expect(service.remove('farm-1', 'manager-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(cropsRepo.count).not.toHaveBeenCalled();
      expect(txManager.update).not.toHaveBeenCalled();
    });
  });

  // Per-role capability defaults for one farm — "my workers may record
  // harvests". Owner only: a manager who could widen their own role would
  // make the policy decorative.
  describe('setRolePolicy', () => {
    it('persists a valid policy and reports it back', async () => {
      repository.update.mockResolvedValue(undefined);
      const policy = { worker: { RECORD_HARVEST: true } };

      await expect(
        service.setRolePolicy('farm-1', 'user-1', policy),
      ).resolves.toEqual({ farmId: 'farm-1', rolePolicy: policy });
      expect(repository.update).toHaveBeenCalledWith('farm-1', {
        rolePolicy: policy,
      });
    });

    it('asserts OWNER_ONLY before writing anything', async () => {
      const access = module.get(FarmAccessService) as any;
      access.assertCanAccessFarm.mockRejectedValueOnce(
        new ForbiddenException(),
      );

      await expect(
        service.setRolePolicy('farm-1', 'manager-1', {
          worker: { RECORD_HARVEST: true },
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown role or capability', async () => {
      await expect(
        service.setRolePolicy('farm-1', 'user-1', {
          owner: { RECORD_HARVEST: true },
        } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.setRolePolicy('farm-1', 'user-1', {
          worker: { OWNER_ONLY: true },
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('stores null for an empty policy, so "cleared" reads as never set', async () => {
      repository.update.mockResolvedValue(undefined);

      await expect(
        service.setRolePolicy('farm-1', 'user-1', {}),
      ).resolves.toEqual({ farmId: 'farm-1', rolePolicy: null });
    });
  });
});
