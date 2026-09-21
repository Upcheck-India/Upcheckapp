import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { canonicalPhone } from '../auth/supabase-auth.service';
import { Farm } from '../farms/farm.entity';
import { FarmMember } from '../farm-access/farm-member.entity';
import { Pond } from '../ponds/pond.entity';
import { Crop } from '../crops/crop.entity';
import { isMissingSchema } from '../health-observations/health.constants';
import { SearchFarmsDto, SearchUsersDto } from './dto/search-users.dto';

/**
 * Every `User`/`Farm` read below passes an explicit `select` — see
 * AGENTS.md "Scope every User query". Nothing here returns a push token, a
 * TOTP secret, backup codes or a password hash: this is a read-only
 * personal-data surface, and only staff who already know who they're
 * looking for reach it (exact email/phone/id, or a farm-name prefix).
 *
 * Route params carry the subject id (`/admin/users/:id`, `/admin/farms/:id`)
 * so C5.1's global admin-access-log interceptor can name the subject — this
 * service does not log anything itself.
 */
const USER_SUMMARY_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  authProvider: true,
  createdAt: true,
  lastLoginAt: true,
  isActive: true,
  verificationLevel: true,
} as const;

@Injectable()
export class AdminDirectoryService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Farm) private readonly farmsRepo: Repository<Farm>,
    @InjectRepository(FarmMember) private readonly membersRepo: Repository<FarmMember>,
    @InjectRepository(Pond) private readonly pondsRepo: Repository<Pond>,
    @InjectRepository(Crop) private readonly cropsRepo: Repository<Crop>,
    private readonly dataSource: DataSource,
  ) {}

  // ──────────────────────────────── users ──────────────────────────────────

  async searchUsers(query: SearchUsersDto): Promise<Partial<User>[]> {
    if (query.id) {
      const user = await this.usersRepo.findOne({
        where: { id: query.id },
        select: USER_SUMMARY_SELECT,
      });
      return user ? [user] : [];
    }
    if (query.email) {
      const user = await this.usersRepo.findOne({
        where: { email: query.email },
        select: USER_SUMMARY_SELECT,
      });
      return user ? [user] : [];
    }
    if (query.phone) {
      const user = await this.usersRepo.findOne({
        where: { phone: canonicalPhone(query.phone) },
        select: USER_SUMMARY_SELECT,
      });
      return user ? [user] : [];
    }
    return [];
  }

  async getUser(id: string): Promise<
    Partial<User> & { farms: { farmId: string; farmName: string; role: string; status: string }[] }
  > {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: USER_DETAIL_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');

    const memberships = await this.membersRepo.find({
      where: { userId: id },
      select: { farmId: true, role: true, status: true },
    });
    const farmNames = memberships.length
      ? await this.farmsRepo.find({
          where: memberships.map((m) => ({ id: m.farmId })),
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(farmNames.map((f) => [f.id, f.name]));

    return {
      ...user,
      farms: memberships.map((m) => ({
        farmId: m.farmId,
        farmName: nameById.get(m.farmId) ?? '(deleted farm)',
        role: m.role,
        status: m.status,
      })),
    };
  }

  // ──────────────────────────────── farms ──────────────────────────────────

  async searchFarms(query: SearchFarmsDto): Promise<Partial<Farm>[]> {
    return this.farmsRepo.find({
      where: { name: ILike(`${query.name}%`) },
      select: { id: true, name: true, farmCode: true, userId: true },
      take: 25,
      order: { name: 'ASC' },
    });
  }

  async getFarm(id: string) {
    const farm = await this.farmsRepo.findOne({
      where: { id },
      select: { id: true, name: true, farmCode: true, userId: true, createdAt: true },
    });
    if (!farm) throw new NotFoundException('Farm not found');

    const [owner, members, ponds, cycles, activity30d] = await Promise.all([
      this.usersRepo.findOne({ where: { id: farm.userId }, select: USER_SUMMARY_SELECT }),
      this.membersRepo.find({
        where: { farmId: id },
        select: { userId: true, role: true, status: true },
      }),
      this.pondsRepo.find({
        where: { farmId: id },
        select: { id: true, name: true, status: true },
      }),
      this.cropsRepo.find({
        where: { farmId: id },
        select: { id: true, name: true, status: true, pondId: true, createdAt: true },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.activityLast30d(id),
    ]);

    const memberUserIds = members.map((m) => m.userId);
    const memberUsers = memberUserIds.length
      ? await this.usersRepo.find({
          where: memberUserIds.map((uid) => ({ id: uid })),
          select: USER_SUMMARY_SELECT,
        })
      : [];
    const userById = new Map(memberUsers.map((u) => [u.id, u]));

    return {
      ...farm,
      owner,
      members: members.map((m) => ({
        ...userById.get(m.userId),
        userId: m.userId,
        role: m.role,
        status: m.status,
      })),
      ponds,
      cycles,
      recentActivity: { measurementsLast30d: activity30d },
    };
  }

  /** Measurement rows logged in the last 30 days across this farm's ponds. */
  private async activityLast30d(farmId: string): Promise<number | null> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT count(*) AS count
         FROM measurements m
         JOIN ponds p ON p.id = m.pond_id
         WHERE p.farm_id = $1 AND m.created_at >= now() - interval '30 days'`,
        [farmId],
      );
      return Number(row.count);
    } catch (err) {
      if (isMissingSchema(err)) return null;
      throw err;
    }
  }
}
