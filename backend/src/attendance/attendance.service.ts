import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { PushService } from '../push/push.service';
import { istDayRangeUtc, toIstDateString } from '../common/ist-date';

/**
 * Only the fields needed to show a name. A bare relation load selects every
 * mapped User column — including password_hash, and including columns a
 * not-yet-run migration may not have created. Mirrors PUBLIC_USER_SELECT in
 * farm-members.service.ts.
 */
const PUBLIC_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  avatarUrl: true,
} as const;

/** Both people on a record, name fields only. */
const WITH_PEOPLE = {
  relations: { user: true, checkedOutBy: true },
  select: { user: PUBLIC_USER_SELECT, checkedOutBy: PUBLIC_USER_SELECT },
} as const;

const HOUR_MS = 60 * 60 * 1000;
/** A second tap on Check in this soon after the first returns the first. */
const DOUBLE_TAP_MS = 2 * 60 * 1000;
/** Clock skew allowed on a check-out time. */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

const REASON_TEXT: Record<string, string> = {
  forgot: 'forgot to check out',
  left_early: 'left early',
  shift_end: 'shift ended',
  other: 'other',
};

/**
 * Postgres "undefined_table" (42P01) — same pattern as farm-access.service.ts
 * and disease.service.ts: attendance_records is a brand-new table, so a
 * deploy-before-migrate window is possible. Reads degrade to empty rather
 * than 500ing; writes naturally fail until the migration runs (there's
 * nothing safe to write to).
 */
function isMissingTable(err: any): boolean {
  return (err?.code ?? err?.driverError?.code) === '42P01';
}

function displayName(u?: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
} | null): string {
  return (
    [u?.firstName, u?.lastName].filter(Boolean).join(' ') ||
    u?.username ||
    'Someone'
  );
}

/** 'HH:MM' IST for an instant. */
function istTime(d: Date): string {
  return new Date(d.getTime() + 5.5 * HOUR_MS).toISOString().slice(11, 16);
}

/**
 * When a shift that started at `checkInAt` is expected to end (spec B.1, Q4).
 *
 * With a farm shift end, an arrival more than an hour before it ends at that
 * IST wall-clock time on the check-in's IST day. A late arrival (within the
 * last hour, or after), or a farm with no shift end, gets check-in + shiftHours.
 */
export function expectedEnd(
  checkInAt: Date,
  farm?: { shiftEndLocal?: string | null; shiftHours?: number | null } | null,
): Date {
  const hours = farm?.shiftHours ?? 9;
  if (farm?.shiftEndLocal) {
    const [hh, mm] = farm.shiftEndLocal.split(':').map(Number);
    const dayStart = istDayRangeUtc(toIstDateString(checkInAt)).start;
    const end = new Date(dayStart.getTime() + hh * HOUR_MS + mm * 60000);
    if (checkInAt.getTime() < end.getTime() - HOUR_MS) return end;
  }
  return new Date(checkInAt.getTime() + hours * HOUR_MS);
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    private readonly farmAccess: FarmAccessService,
    private readonly push: PushService,
  ) {}

  /**
   * Check in. Defaults to the caller's own record; a manager/owner may
   * back-fill a different worker's check-in by supplying userId, gated on
   * MANAGE_WORKERS (not overridable, B11). Idempotent on the client-minted id
   * (offline replay).
   *
   * One open record per person (B.4, Q6): a self check-in closes the caller's
   * other open records at min(new check-in, their expected end), marked
   * 'auto_closed'. Never a 409 — an offline queue replaying it must not drop it.
   */
  async checkIn(callerId: string, dto: CheckInDto) {
    if (dto.id) {
      const existing = await this.attendanceRepo.findOne({
        where: { id: dto.id },
      });
      if (existing) {
        await this.farmAccess.assertCanAccessFarm(
          callerId,
          existing.farmId,
          'WRITE_OPERATIONAL',
        );
        return existing;
      }
    }

    const targetUserId = dto.userId ?? callerId;
    const isSelf = targetUserId === callerId;
    const farm = await this.farmAccess.assertCanAccessFarm(
      callerId,
      dto.farmId,
      isSelf ? 'WRITE_OPERATIONAL' : 'MANAGE_WORKERS',
    );

    const checkInAt = dto.checkInAt ? new Date(dto.checkInAt) : new Date();
    const record = this.attendanceRepo.create({
      id: dto.id,
      farmId: dto.farmId,
      userId: targetUserId,
      checkInAt,
    });

    if (isSelf) {
      const open = await this.attendanceRepo.find({
        where: { userId: callerId, checkOutAt: IsNull() },
        relations: { farm: true },
        select: { farm: { id: true, shiftEndLocal: true, shiftHours: true } },
        order: { checkInAt: 'DESC' },
      });

      const tapped = open.find(
        (r) =>
          r.farmId === dto.farmId &&
          Date.now() - new Date(r.createdAt).getTime() < DOUBLE_TAP_MS,
      );
      if (tapped) return tapped;

      for (const old of open) {
        const oldIn = new Date(old.checkInAt);
        if (oldIn > checkInAt) {
          // A replayed older check-in arriving after a newer one: close the
          // incoming record instead of the newer shift.
          const end = expectedEnd(checkInAt, farm);
          record.checkOutAt = end < oldIn ? end : oldIn;
          record.checkedOutById = callerId;
          record.checkOutReason = 'auto_closed';
          continue;
        }
        const end = expectedEnd(oldIn, old.farm);
        old.checkOutAt = end < checkInAt ? end : checkInAt;
        old.checkedOutById = callerId;
        old.checkOutReason = 'auto_closed';
        delete (old as Partial<AttendanceRecord>).farm;
        await this.attendanceRepo.save(old);
      }
    }

    return this.attendanceRepo.save(record);
  }

  /**
   * Check out (B.6).
   *
   * Own record: WRITE_OPERATIONAL, 409 if already closed; a past checkOutAt
   * fixes a forgotten shift. Someone else's: MANAGE_WORKERS plus a reason; a
   * closed record may be corrected. Either way checkIn ≤ checkOutAt ≤ now+5min.
   */
  async checkOut(callerId: string, id: string, dto: CheckOutDto) {
    const record = await this.attendanceRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    const isSelf = record.userId === callerId;
    const farm = await this.farmAccess.assertCanAccessFarm(
      callerId,
      record.farmId,
      isSelf ? 'WRITE_OPERATIONAL' : 'MANAGE_WORKERS',
    );

    if (isSelf && record.checkOutAt) {
      throw new ConflictException('Already checked out');
    }
    if (!isSelf && !dto.reason) {
      throw new BadRequestException(
        "A reason is required to check out someone else's shift",
      );
    }

    const now = Date.now();
    const at = dto.checkOutAt ? new Date(dto.checkOutAt) : new Date(now);
    if (
      at.getTime() < new Date(record.checkInAt).getTime() ||
      at.getTime() > now + FUTURE_SLACK_MS
    ) {
      throw new BadRequestException(
        'checkOutAt must be between check-in and now',
      );
    }

    record.checkOutAt = at;
    record.checkedOutById = callerId;
    record.checkOutReason = isSelf ? (dto.reason ?? 'self') : dto.reason!;
    await this.attendanceRepo.save(record);

    const saved =
      (await this.attendanceRepo.findOne({ where: { id }, ...WITH_PEOPLE })) ??
      record;

    if (!isSelf) {
      await this.push
        .sendToUser(record.userId, {
          title: 'Check-out recorded',
          body: `Your check-out at ${farm.name} was recorded at ${istTime(at)} by ${displayName(saved.checkedOutBy)} (${REASON_TEXT[dto.reason!]})`,
          data: {
            type: 'attendance_checkout',
            farmId: record.farmId,
            attendanceId: record.id,
          },
        })
        .catch((err: any) =>
          this.logger.warn(
            `Failed to notify ${record.userId} of check-out ${record.id}: ${err?.message ?? err}`,
          ),
        );
    }

    return saved;
  }

  /** The caller's own attendance records for a farm, most recent first. */
  async findMine(
    callerId: string,
    farmId: string,
    date?: string,
    from?: string,
    to?: string,
    openOnly = false,
  ) {
    await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'READ');
    try {
      return await this.attendanceRepo.find({
        where: {
          farmId,
          userId: callerId,
          ...window(date, from, to),
          ...(openOnly ? { checkOutAt: IsNull() } : {}),
        },
        order: { checkInAt: 'DESC' },
        ...WITH_PEOPLE,
      });
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      this.logger.warn(
        'attendance_records table missing — run migrations; returning empty',
      );
      return [];
    }
  }

  /** Every farm member's attendance for a farm (owner/manager only). */
  async findAllForFarm(
    callerId: string,
    farmId: string,
    date?: string,
    from?: string,
    to?: string,
    openOnly = false,
  ) {
    await this.farmAccess.assertCanAccessFarm(
      callerId,
      farmId,
      'WRITE_MANAGEMENT',
    );
    try {
      return await this.attendanceRepo.find({
        where: {
          farmId,
          ...window(date, from, to),
          ...(openOnly ? { checkOutAt: IsNull() } : {}),
        },
        order: { checkInAt: 'DESC' },
        ...WITH_PEOPLE,
      });
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      this.logger.warn(
        'attendance_records table missing — run migrations; returning empty',
      );
      return [];
    }
  }

  /**
   * WHO is checked in right now on a farm: open check-ins on today's IST day.
   * READ-level, so names only — no timestamps leave this method (B.5, Q5).
   */
  async presentNow(callerId: string, farmId: string, now = new Date()) {
    await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'READ');
    try {
      const rows = await this.attendanceRepo.find({
        where: {
          farmId,
          checkOutAt: IsNull(),
          ...window(toIstDateString(now)),
        },
        relations: { user: true },
        select: { user: PUBLIC_USER_SELECT },
      });
      const byUser = new Map<string, { farmId: string; userId: string; name: string }>();
      for (const r of rows) {
        byUser.set(r.userId, {
          farmId,
          userId: r.userId,
          name: displayName(r.user),
        });
      }
      return [...byUser.values()];
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      return [];
    }
  }
}

/**
 * The check-in window to filter on, as a TypeORM `where` fragment.
 *
 * `date` is one IST day. `from`/`to` are an inclusive IST day range, which
 * is what a month view asks for — the calendar needs every day at once, and
 * 31 single-day requests to paint one screen is not a thing to ship. Either
 * end may be omitted; with neither, the filter is absent and every record for
 * the farm comes back, exactly as before.
 */
function window(date?: string, from?: string, to?: string) {
  if (date) {
    const { start, end } = istDayRangeUtc(date);
    return { checkInAt: Between(start, end) };
  }
  if (!from && !to) return {};
  // A half-open request still has to be a range, so widen the missing end to
  // something no real record sits outside of.
  const start = from ? istDayRangeUtc(from).start : new Date(0);
  const end = to ? istDayRangeUtc(to).end : new Date(8.64e15);
  return { checkInAt: Between(start, end) };
}
