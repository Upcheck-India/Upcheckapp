import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceService, expectedEnd } from './attendance.service';
import { AttendanceRecord } from './attendance.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { PushService } from '../push/push.service';
import { roleSatisfies } from '../farm-access/farm-capability';

const FARM = { id: 'farm-1', name: 'Kovalam East', shiftEndLocal: null, shiftHours: 9 };

describe('expectedEnd', () => {
  it('ends at the farm shift end (IST) for an arrival well before it', () => {
    // 09:12 IST → 18:00 IST same day (12:30Z)
    const end = expectedEnd(new Date('2026-09-14T03:42:00Z'), { shiftEndLocal: '18:00', shiftHours: 9 });
    expect(end.toISOString()).toBe('2026-09-14T12:30:00.000Z');
  });

  it('uses the IST day for a pre-05:30 IST arrival', () => {
    // 05:00 IST on 14 Sep is 23:30Z on 13 Sep
    const end = expectedEnd(new Date('2026-09-13T23:30:00Z'), { shiftEndLocal: '18:00', shiftHours: 9 });
    expect(end.toISOString()).toBe('2026-09-14T12:30:00.000Z');
  });

  it('late arrival (check-in ≥ shift end − 1h) gets check-in + shiftHours', () => {
    // 17:00 IST exactly = shiftEnd − 1h
    const inAt = new Date('2026-09-14T11:30:00Z');
    const end = expectedEnd(inAt, { shiftEndLocal: '18:00', shiftHours: 8 });
    expect(end.getTime() - inAt.getTime()).toBe(8 * 3600000);
  });

  it('no farm setting → check-in + 9h', () => {
    const inAt = new Date('2026-09-14T03:00:00Z');
    expect(expectedEnd(inAt, { shiftEndLocal: null }).getTime() - inAt.getTime()).toBe(9 * 3600000);
    expect(expectedEnd(inAt, null).getTime() - inAt.getTime()).toBe(9 * 3600000);
  });
});

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let farmAccess: { assertCanAccessFarm: jest.Mock };
  let push: { sendToUser: jest.Mock };

  beforeEach(async () => {
    attendanceRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    farmAccess = { assertCanAccessFarm: jest.fn().mockResolvedValue(FARM) };
    push = { sendToUser: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: getRepositoryToken(AttendanceRecord), useValue: attendanceRepo },
        { provide: FarmAccessService, useValue: farmAccess },
        { provide: PushService, useValue: push },
      ],
    }).compile();

    service = module.get(AttendanceService);
  });

  describe('checkIn', () => {
    it('creates a self check-in gated on WRITE_OPERATIONAL', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);

      const result = await service.checkIn('worker-1', { farmId: 'farm-1', id: 'rec-1' });

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('worker-1', 'farm-1', 'WRITE_OPERATIONAL');
      expect(attendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rec-1', farmId: 'farm-1', userId: 'worker-1' }),
      );
      expect(result).toEqual(expect.objectContaining({ userId: 'worker-1' }));
    });

    it("requires MANAGE_WORKERS to back-fill a different worker's check-in", async () => {
      attendanceRepo.findOne.mockResolvedValue(null);

      await service.checkIn('manager-1', { farmId: 'farm-1', userId: 'worker-2', id: 'rec-2' });

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('manager-1', 'farm-1', 'MANAGE_WORKERS');
    });

    it('is idempotent on the client-minted id (offline replay)', async () => {
      const existing = { id: 'rec-1', farmId: 'farm-1', userId: 'worker-1' };
      attendanceRepo.findOne.mockResolvedValue(existing);

      const result = await service.checkIn('worker-1', { farmId: 'farm-1', id: 'rec-1' });

      expect(attendanceRepo.create).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('auto-closes an open record on another farm at min(newIn, expectedEnd)', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);
      // Old: 06:00 IST, farm B with no shift end → expected end 15:00 IST.
      const old = {
        id: 'old', farmId: 'farm-2', userId: 'worker-1', checkOutAt: null,
        checkInAt: new Date('2026-09-14T00:30:00Z'), createdAt: new Date('2026-09-14T00:30:00Z'),
        farm: { id: 'farm-2', shiftEndLocal: null, shiftHours: 9 },
      };
      attendanceRepo.find.mockResolvedValue([old]);

      // New check-in next day → expected end (earlier) wins.
      await service.checkIn('worker-1', { farmId: 'farm-1', id: 'new', checkInAt: '2026-09-15T01:00:00Z' });
      expect(old.checkOutAt).toEqual(new Date('2026-09-14T09:30:00Z'));
      expect(old).toEqual(expect.objectContaining({ checkedOutById: 'worker-1', checkOutReason: 'auto_closed' }));
      expect(attendanceRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'old' }));
      expect(attendanceRepo.save).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'new', userId: 'worker-1' }));
    });

    it('auto-close uses the new check-in when it comes before expected end', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);
      const old = {
        id: 'old', farmId: 'farm-2', userId: 'worker-1', checkOutAt: null,
        checkInAt: new Date('2026-09-14T00:30:00Z'), createdAt: new Date('2026-09-14T00:30:00Z'),
        farm: { id: 'farm-2', shiftEndLocal: null, shiftHours: 9 },
      };
      attendanceRepo.find.mockResolvedValue([old]);

      await service.checkIn('worker-1', { farmId: 'farm-1', id: 'new', checkInAt: '2026-09-14T04:00:00Z' });
      expect(old.checkOutAt).toEqual(new Date('2026-09-14T04:00:00Z'));
    });

    it('same-farm double-tap within 2 min returns the existing record', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);
      const open = {
        id: 'first', farmId: 'farm-1', userId: 'worker-1', checkOutAt: null,
        checkInAt: new Date(), createdAt: new Date(Date.now() - 30_000), farm: FARM,
      };
      attendanceRepo.find.mockResolvedValue([open]);

      const result = await service.checkIn('worker-1', { farmId: 'farm-1', id: 'second' });

      expect(result).toBe(open);
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });

    it('does not auto-close anything when back-filling someone else', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);
      await service.checkIn('manager-1', { farmId: 'farm-1', userId: 'worker-2', id: 'rec-2' });
      expect(attendanceRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('checkOut', () => {
    const inAt = () => new Date(Date.now() - 3 * 3600000);

    it('throws NotFoundException for a missing record', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);
      await expect(service.checkOut('worker-1', 'rec-1', {})).rejects.toThrow(NotFoundException);
    });

    it('allows the worker to check themselves out, reason self', async () => {
      attendanceRepo.findOne.mockResolvedValueOnce({ id: 'rec-1', farmId: 'farm-1', userId: 'worker-1', checkInAt: inAt(), checkOutAt: null });
      attendanceRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.checkOut('worker-1', 'rec-1', {});

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('worker-1', 'farm-1', 'WRITE_OPERATIONAL');
      expect(result.checkOutAt).toBeInstanceOf(Date);
      expect(result).toEqual(expect.objectContaining({ checkedOutById: 'worker-1', checkOutReason: 'self' }));
      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('own forgotten shift may pass a past checkOutAt', async () => {
      const rec = { id: 'rec-1', farmId: 'farm-1', userId: 'worker-1', checkInAt: new Date('2026-09-13T00:40:00Z'), checkOutAt: null };
      attendanceRepo.findOne.mockResolvedValueOnce(rec).mockResolvedValueOnce(null);

      const result = await service.checkOut('worker-1', 'rec-1', { checkOutAt: '2026-09-13T12:30:00Z' });
      expect(result.checkOutAt).toEqual(new Date('2026-09-13T12:30:00Z'));
    });

    it('own second check-out → 409', async () => {
      attendanceRepo.findOne.mockResolvedValue({ id: 'rec-1', farmId: 'farm-1', userId: 'worker-1', checkInAt: inAt(), checkOutAt: new Date() });
      await expect(service.checkOut('worker-1', 'rec-1', {})).rejects.toThrow(ConflictException);
    });

    it('manager checks out a worker → MANAGE_WORKERS, sets by/reason, pushes', async () => {
      const rec = { id: 'rec-1', farmId: 'farm-1', userId: 'worker-2', checkInAt: inAt(), checkOutAt: null };
      attendanceRepo.findOne
        .mockResolvedValueOnce(rec)
        .mockResolvedValueOnce({ ...rec, checkedOutBy: { firstName: 'Ravi' } });

      const result = await service.checkOut('manager-1', 'rec-1', { reason: 'forgot' });

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('manager-1', 'farm-1', 'MANAGE_WORKERS');
      expect(rec).toEqual(expect.objectContaining({ checkedOutById: 'manager-1', checkOutReason: 'forgot' }));
      expect(result.checkedOutBy).toEqual({ firstName: 'Ravi' });
      expect(push.sendToUser).toHaveBeenCalledWith(
        'worker-2',
        expect.objectContaining({
          body: expect.stringMatching(/^Your check-out at Kovalam East was recorded at \d\d:\d\d by Ravi \(forgot to check out\)$/),
        }),
      );
    });

    it("someone else's record without a reason → 400", async () => {
      attendanceRepo.findOne.mockResolvedValue({ id: 'rec-1', farmId: 'farm-1', userId: 'worker-2', checkInAt: inAt(), checkOutAt: null });
      await expect(service.checkOut('manager-1', 'rec-1', {})).rejects.toThrow(BadRequestException);
    });

    it('manager may correct an already-closed record with a reason', async () => {
      const rec = { id: 'rec-1', farmId: 'farm-1', userId: 'worker-2', checkInAt: inAt(), checkOutAt: new Date(), checkedOutById: 'worker-2' };
      attendanceRepo.findOne.mockResolvedValueOnce(rec).mockResolvedValueOnce(null);
      await service.checkOut('manager-1', 'rec-1', { reason: 'left_early' });
      expect(rec.checkedOutById).toBe('manager-1');
    });

    it('worker checking out another → Forbidden', async () => {
      attendanceRepo.findOne.mockResolvedValue({ id: 'rec-1', farmId: 'farm-1', userId: 'worker-2', checkInAt: inAt(), checkOutAt: null });
      farmAccess.assertCanAccessFarm.mockRejectedValue(new ForbiddenException());

      await expect(service.checkOut('worker-1', 'rec-1', { reason: 'forgot' })).rejects.toThrow(ForbiddenException);
      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('worker-1', 'farm-1', 'MANAGE_WORKERS');
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });

    // The gate is MANAGE_WORKERS precisely because an override can't grant it.
    it('worker with a WRITE_MANAGEMENT override still fails MANAGE_WORKERS', () => {
      const overrides = { WRITE_MANAGEMENT: true };
      expect(roleSatisfies('worker', 'WRITE_MANAGEMENT', overrides)).toBe(true);
      expect(roleSatisfies('worker', 'MANAGE_WORKERS', overrides)).toBe(false);
    });

    it('checkOutAt before check-in → 400', async () => {
      const rec = { id: 'rec-1', farmId: 'farm-1', userId: 'worker-1', checkInAt: inAt(), checkOutAt: null };
      attendanceRepo.findOne.mockResolvedValue(rec);
      await expect(
        service.checkOut('worker-1', 'rec-1', { checkOutAt: new Date(rec.checkInAt.getTime() - 60000).toISOString() }),
      ).rejects.toThrow(BadRequestException);
    });

    it('checkOutAt more than 5 min in the future → 400; within 5 min is fine', async () => {
      const rec = { id: 'rec-1', farmId: 'farm-1', userId: 'worker-1', checkInAt: inAt(), checkOutAt: null };
      attendanceRepo.findOne.mockResolvedValue(rec);
      await expect(
        service.checkOut('worker-1', 'rec-1', { checkOutAt: new Date(Date.now() + 6 * 60000).toISOString() }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.checkOut('worker-1', 'rec-1', { checkOutAt: new Date(Date.now() + 4 * 60000).toISOString() }),
      ).resolves.toBeDefined();
    });

    it('push failure does not fail the check-out', async () => {
      const rec = { id: 'rec-1', farmId: 'farm-1', userId: 'worker-2', checkInAt: inAt(), checkOutAt: null };
      attendanceRepo.findOne.mockResolvedValueOnce(rec).mockResolvedValueOnce(null);
      push.sendToUser.mockRejectedValue(new Error('expo down'));

      await expect(service.checkOut('manager-1', 'rec-1', { reason: 'shift_end' })).resolves.toEqual(
        expect.objectContaining({ checkOutReason: 'shift_end' }),
      );
    });
  });

  describe('findMine / findAllForFarm / presentNow', () => {
    it("findMine scopes the query to the caller's own records", async () => {
      await service.findMine('worker-1', 'farm-1');

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('worker-1', 'farm-1', 'READ');
      expect(attendanceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ farmId: 'farm-1', userId: 'worker-1' }) }),
      );
    });

    // The month calendar asks for a whole month in one request. Without a
    // range the screen would fire 31 single-day calls to paint itself.
    it('filters on an inclusive IST day range when given from/to', async () => {
      await service.findAllForFarm('owner-1', 'farm-1', undefined, '2026-08-01', '2026-08-31');

      const where = attendanceRepo.find.mock.calls[0][0].where;
      expect(where.checkInAt).toBeDefined();
      const [start, end] = where.checkInAt.value;
      expect(start.toISOString()).toBe('2026-07-31T18:30:00.000Z');
      expect(end.toISOString()).toBe('2026-08-31T18:29:59.999Z');
    });

    it('openOnly adds check_out_at IS NULL; loads checkedOutBy like user', async () => {
      await service.findAllForFarm('owner-1', 'farm-1', undefined, '2026-09-01', undefined, true);

      const opts = attendanceRepo.find.mock.calls[0][0];
      expect(opts.where.checkOutAt).toBeDefined();
      expect(opts.relations).toEqual({ user: true, checkedOutBy: true });
      expect(opts.select.checkedOutBy).toEqual(opts.select.user);
    });

    it('applies no date filter at all when neither date nor range is given', async () => {
      await service.findMine('worker-1', 'farm-1');

      expect(attendanceRepo.find.mock.calls[0][0].where.checkInAt).toBeUndefined();
      expect(attendanceRepo.find.mock.calls[0][0].where.checkOutAt).toBeUndefined();
    });

    it('findAllForFarm requires WRITE_MANAGEMENT (owner/manager only)', async () => {
      await service.findAllForFarm('manager-1', 'farm-1');

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('manager-1', 'farm-1', 'WRITE_MANAGEMENT');
    });

    it('findMine degrades to an empty array when the table is missing (42P01)', async () => {
      attendanceRepo.find.mockRejectedValue({ code: '42P01' });

      const result = await service.findMine('worker-1', 'farm-1');

      expect(result).toEqual([]);
    });

    it('presentNow is READ-level and returns names only, deduped by user', async () => {
      attendanceRepo.find.mockResolvedValue([
        { userId: 'u1', checkInAt: new Date(), user: { firstName: 'Suresh', lastName: 'K' } },
        { userId: 'u1', checkInAt: new Date(), user: { firstName: 'Suresh', lastName: 'K' } },
        { userId: 'u2', checkInAt: new Date(), user: { username: 'ravi' } },
      ]);

      const out = await service.presentNow('worker-1', 'farm-1', new Date('2026-09-14T06:00:00Z'));

      expect(farmAccess.assertCanAccessFarm).toHaveBeenCalledWith('worker-1', 'farm-1', 'READ');
      expect(out).toEqual([
        { farmId: 'farm-1', userId: 'u1', name: 'Suresh K' },
        { farmId: 'farm-1', userId: 'u2', name: 'ravi' },
      ]);
      const [start] = attendanceRepo.find.mock.calls[0][0].where.checkInAt.value;
      expect(start.toISOString()).toBe('2026-09-13T18:30:00.000Z');
    });
  });
});
