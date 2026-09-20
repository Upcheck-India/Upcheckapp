import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isMissingSchema } from '../health-observations/health.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { randomBytes } from 'crypto';
import { Farm } from './farm.entity';
import { Crop } from '../crops/crop.entity';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto, SHIFT_FIELDS } from './dto/update-farm.dto';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { FarmMember, FarmRole } from '../farm-access/farm-member.entity';
import {
  FarmCapability,
  RolePolicy,
  invalidPolicyKey,
} from '../farm-access/farm-capability';

/**
 * Roles that see a farm's district but never its raw coordinates (spec
 * 2026-09-20 compliance C0.2). District is enough for a worker or a viewer;
 * the owner set the pin, the owner (and a manager, who can already see
 * everything a worker can plus more) may read it back.
 */
const COORDINATE_HIDDEN_ROLES: readonly FarmRole[] = ['worker', 'viewer'];

@Injectable()
export class FarmsService {
  constructor(
    @InjectRepository(Farm)
    private farmsRepository: Repository<Farm>,
    @InjectRepository(FarmMember)
    private readonly farmMembersRepository: Repository<FarmMember>,
    private readonly farmAccess: FarmAccessService,
  ) {}

  /**
   * Verify that the user OWNS the farm (strict). Returns the farm or throws.
   * Used for owner-only operations (economics, farm/pond lifecycle).
   */
  async verifyOwnership(farmId: string, userId: string): Promise<Farm> {
    const farm = await this.farmsRepository.findOneBy({ id: farmId });
    if (!farm) {
      throw new NotFoundException(`Farm with ID ${farmId} not found`);
    }
    if (farm.deletedAt) {
      throw new NotFoundException(`Farm with ID ${farmId} not found`);
    }
    if (farm.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this farm',
      );
    }
    return farm;
  }

  /**
   * Member-aware access check: passes for owner OR worker per the requested
   * capability. Use for worker-permitted reads/writes (e.g. viewing inventory).
   */
  async verifyAccess(
    farmId: string,
    userId: string,
    capability: FarmCapability,
  ): Promise<Farm> {
    return this.farmAccess.assertCanAccessFarm(userId, farmId, capability);
  }

  /**
   * Internal method to fetch farm by ID (e.g. for system alerts)
   */
  async findOneInternal(farmId: string): Promise<Farm | null> {
    return this.farmsRepository.findOneBy({ id: farmId });
  }

  /**
   * Generate a unique 8-character alphanumeric farm code.
   *
   * Throws if it cannot find a free code in 10 attempts. It used to fall out of
   * the loop and return the last (colliding) candidate, which then hit the
   * UNIQUE constraint on insert and surfaced as an opaque driver error — better
   * to fail here, where the cause is obvious.
   */
  private async generateFarmCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I/O/0/1 for readability

    for (let attempts = 0; attempts < 10; attempts++) {
      let code = '';
      const bytes = randomBytes(8);
      for (let i = 0; i < 8; i++) {
        code += chars[bytes[i] % chars.length];
      }
      const existing = await this.farmsRepository.findOneBy({ farmCode: code });
      if (!existing) return code;
    }

    throw new InternalServerErrorException(
      'Could not allocate a unique farm code. Please try again.',
    );
  }

  async create(createFarmDto: CreateFarmDto, userId: string) {
    // Always server-generated — see the NOTE in create-farm.dto.ts.
    const farmCode = await this.generateFarmCode();

    const farm = this.farmsRepository.create({
      name: createFarmDto.name,
      areaHectares: createFarmDto.areaHectares,
      // `as any`: the DTO fields accept `null` (a "clear this" signal for
      // UpdateFarmDto), which the entity's TS type doesn't — same reasoning
      // as the existing waterSourceType/privacySetting casts below.
      address: createFarmDto.address as any,
      longitude: createFarmDto.longitude as any,
      latitude: createFarmDto.latitude as any,
      waterSourceType: createFarmDto.waterSourceType as any,
      plannedPondCount: createFarmDto.plannedPondCount,
      qrCodeUrl: createFarmDto.qrCodeUrl,
      privacySetting: createFarmDto.privacySetting as any,
      boundary: createFarmDto.boundary,
      userId,
      farmCode,
    });
    const saved = await this.farmsRepository.save(farm);

    // Give the owner a real membership row.
    //
    // Ownership has been carried by `farm.userId` alone, with every capability
    // check falling back to an owner fast-path. That is fine for authorization
    // but it makes the owner INVISIBLE to anything that reads the roster:
    // listMembers returned everyone except the person who owns the farm. Hence
    // "1 of 0 checked in today" — the owner checked themselves in, but the
    // denominator counts members and the owner was not one of them.
    //
    // Best-effort on purpose: a farm without this row behaves exactly as it did
    // before, because the fast-path is untouched. Failing to write it must not
    // fail the farm creation that already succeeded.
    try {
      await this.farmMembersRepository.insert({
        farmId: saved.id,
        userId,
        role: 'owner',
        status: 'active',
      } as any);
    } catch {
      // Already present, or farm_members has not been migrated in this env.
    }

    // state_code / district_code: raw SQL, not entity columns — see the note
    // in farm.entity.ts. Best-effort, same reasoning as the membership insert
    // above: an unmigrated district column must not fail a farm creation that
    // already succeeded.
    const location = await this.setLocationDistrict(
      saved.id,
      createFarmDto.stateCode,
      createFarmDto.districtCode,
    );

    return { ...saved, ...location };
  }

  /**
   * Writes only the columns actually provided (undefined = leave alone),
   * so setting the district doesn't clobber a coordinate-only edit and vice
   * versa. Returns what was actually persisted — empty/unset if the migration
   * hasn't run, so a caller never claims a save that didn't happen.
   */
  private async setLocationDistrict(
    farmId: string,
    stateCode: string | null | undefined,
    districtCode: string | null | undefined,
  ): Promise<{ stateCode: string | null; districtCode: string | null }> {
    const result: { stateCode: string | null; districtCode: string | null } = {
      stateCode: null,
      districtCode: null,
    };
    if (stateCode !== undefined) {
      try {
        await this.farmsRepository.query(
          `UPDATE farms SET state_code = $2 WHERE id = $1`,
          [farmId, stateCode],
        );
        result.stateCode = stateCode;
      } catch (err) {
        if (!isMissingSchema(err)) throw err;
      }
    }
    if (districtCode !== undefined) {
      try {
        await this.farmsRepository.query(
          `UPDATE farms SET district_code = $2 WHERE id = $1`,
          [farmId, districtCode],
        );
        result.districtCode = districtCode;
      } catch (err) {
        if (!isMissingSchema(err)) throw err;
      }
    }
    return result;
  }

  /** D4-style raw read (see getCaaRegistrationNo): 42703 reads as nulls. */
  private async getLocationDistrict(
    farmId: string,
  ): Promise<{ stateCode: string | null; districtCode: string | null }> {
    const rows = await this.farmsRepository
      .query(
        `SELECT state_code AS "stateCode", district_code AS "districtCode" FROM farms WHERE id = $1`,
        [farmId],
      )
      .catch((err) => {
        if (isMissingSchema(err)) return [];
        throw err;
      });
    return {
      stateCode: rows?.[0]?.stateCode ?? null,
      districtCode: rows?.[0]?.districtCode ?? null,
    };
  }

  /**
   * Farms the user can access — owned plus any they're a member (worker) of.
   *
   * Archived farms are excluded unless `includeArchived` is set: archiving
   * exists so a finished farm stops cluttering every picker, list and engine,
   * and a default that still returned them would make the action decorative.
   */
  async findAll(userId: string, includeArchived = false) {
    // `includeArchived` MUST be threaded into the access lookup, not just the
    // where-clause below. getAccessibleFarmIds defaults to excluding archived
    // farms, so omitting it here filtered them out of `farmIds` first and the
    // where-clause was then choosing between two archive-free sets — making
    // `?includeArchived=true` return an empty list, always. The "include
    // archived" toggle on the farms list looked broken because it was.
    const farmIds = await this.farmAccess.getAccessibleFarmIds(
      userId,
      includeArchived,
    );
    if (farmIds.length === 0) return [];
    const farms = await this.farmsRepository.find({
      where: includeArchived
        ? { id: In(farmIds) }
        : { id: In(farmIds), archivedAt: IsNull() },
    });
    // Per-farm role: the same user can own one farm and only work another.
    // farmIds is typically small (a person's own farm list), so one role
    // lookup per farm is fine here; getFarmIdsWithCapability's batch pattern
    // is worth reaching for only if this list grows large in practice.
    return Promise.all(
      farms.map(async (farm) => {
        const role = await this.farmAccess.getRoleOnFarm(userId, farm.id);
        return this.stripCoordinatesForRole(farm, role);
      }),
    );
  }

  /**
   * Farms the user OWNS (strict). Used by economic listings (e.g. transactions)
   * that must never surface a member-farm owner's financial data to a worker.
   * Archived farms are excluded, same as findAll.
   */
  async findOwnedByUser(userId: string) {
    return this.farmsRepository.find({
      where: { userId, archivedAt: IsNull() },
    });
  }

  /**
   * `callerId` is optional so internal callers (e.g. `update()`, which
   * already asserted access) don't need a redundant role lookup — but any
   * route that hands this straight to a client MUST pass it, or a worker's
   * farm payload keeps its coordinates.
   */
  async findOne(id: string, callerId?: string) {
    const farm = await this.farmsRepository.findOneBy({ id });
    if (!farm || farm.deletedAt)
      throw new NotFoundException(`Farm with ID ${id} not found`);
    const role = callerId ? await this.farmAccess.getRoleOnFarm(callerId, id) : null;
    const [caaRegistrationNo, location] = await Promise.all([
      this.getCaaRegistrationNo(id),
      this.getLocationDistrict(id),
    ]);
    return {
      ...this.stripCoordinatesForRole(farm, role),
      caaRegistrationNo,
      ...location,
    };
  }

  /** Coordinates absent (not merely null) for worker/viewer — see COORDINATE_HIDDEN_ROLES. */
  private stripCoordinatesForRole(farm: Farm, role: FarmRole | null): Farm {
    if (!role || !COORDINATE_HIDDEN_ROLES.includes(role)) return farm;
    const { latitude, longitude, ...rest } = farm;
    return rest as Farm;
  }

  /**
   * D4: raw SQL, not an entity column, so an unapplied 1780701700000 reads as
   * null instead of breaking every farm read.
   */
  async getCaaRegistrationNo(farmId: string): Promise<string | null> {
    const rows = await this.farmsRepository
      .query(`SELECT caa_registration_no AS v FROM farms WHERE id = $1`, [farmId])
      .catch((err) => {
        if (isMissingSchema(err)) return [];
        throw err;
      });
    return rows?.[0]?.v ?? null;
  }

  // callerId is required: the route admits managers (for the shift), so this
  // check is the only thing keeping every other farm field owner-only. An
  // optional id would let a future caller skip it by omission.
  async update(id: string, updateFarmDto: UpdateFarmDto, callerId: string) {
    const touchesNonShift = Object.entries(updateFarmDto).some(
      ([k, v]) => v !== undefined && !SHIFT_FIELDS.includes(k),
    );
    if (touchesNonShift) {
      await this.farmAccess.assertCanAccessFarm(callerId, id, 'OWNER_ONLY');
    }
    // D4 / C0.2: not entity columns (raw SQL + 42703 fail-safe). Written FIRST
    // so an unapplied migration refuses the whole edit instead of
    // half-saving it — includes "clear location", which is this same path
    // with stateCode/districtCode/latitude/longitude sent as null.
    const { caaRegistrationNo, stateCode, districtCode, ...entityFields } = updateFarmDto;
    if (caaRegistrationNo !== undefined) {
      await this.farmsRepository
        .query(`UPDATE farms SET caa_registration_no = $2 WHERE id = $1`, [
          id,
          caaRegistrationNo?.trim() || null,
        ])
        .catch((err) => {
          if (!isMissingSchema(err)) throw err;
          throw new ServiceUnavailableException(
            'CAA registration number is not available yet (migration 1780701700000 not applied)',
          );
        });
    }
    const districtUnavailable = () => {
      throw new ServiceUnavailableException(
        'Farm district is not available yet (migration 1780702300000 not applied)',
      );
    };
    if (stateCode !== undefined) {
      await this.farmsRepository
        .query(`UPDATE farms SET state_code = $2 WHERE id = $1`, [id, stateCode])
        .catch((err) => (isMissingSchema(err) ? districtUnavailable() : Promise.reject(err)));
    }
    if (districtCode !== undefined) {
      await this.farmsRepository
        .query(`UPDATE farms SET district_code = $2 WHERE id = $1`, [id, districtCode])
        .catch((err) => (isMissingSchema(err) ? districtUnavailable() : Promise.reject(err)));
    }
    if (Object.keys(entityFields).length) {
      // `as any`: entityFields carries the DTO's `| null` clear-signal type
      // for address/latitude/longitude, which TypeORM's QueryDeepPartialEntity
      // types as non-nullable even though the columns are nullable — a real
      // update(id, { latitude: null }) works fine at runtime.
      await this.farmsRepository.update(id, entityFields as any);
    }
    return this.findOne(id);
  }

  /**
   * Set this farm's per-role capability defaults. Owner only — a manager who
   * could widen their own role would make the policy decorative.
   *
   * Stored whole (null clears it), because a partial merge would give an owner
   * no way to take a grant back.
   */
  async setRolePolicy(farmId: string, callerId: string, policy: RolePolicy | null) {
    await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'OWNER_ONLY');
    const bad = invalidPolicyKey(policy);
    if (bad) {
      throw new BadRequestException(
        `"${bad}" is not a role/permission that can be set by policy`,
      );
    }
    const rolePolicy = policy && Object.keys(policy).length > 0 ? policy : null;
    await this.farmsRepository.update(farmId, { rolePolicy });
    return { farmId, rolePolicy };
  }

  /**
   * Archive a farm. Owner only — the route guard says so and this says it
   * again, because the guard is a declaration and the service is the
   * enforcement (same reasoning as setRolePolicy).
   */
  async archive(id: string, callerId: string) {
    const farm = await this.farmAccess.assertCanAccessFarm(
      callerId,
      id,
      'OWNER_ONLY',
    );
    if (farm.archivedAt) {
      throw new BadRequestException('Farm is already archived');
    }
    await this.farmsRepository.update(id, { archivedAt: new Date() });
    return { message: 'Farm archived successfully' };
  }

  async unarchive(id: string, callerId: string) {
    const farm = await this.farmAccess.assertCanAccessFarm(
      callerId,
      id,
      'OWNER_ONLY',
    );
    if (!farm.archivedAt) {
      throw new BadRequestException('Farm is not archived');
    }
    await this.farmsRepository.update(id, { archivedAt: null });
    return { message: 'Farm unarchived successfully' };
  }

  async remove(id: string, callerId: string) {
    await this.farmAccess.assertCanAccessFarm(callerId, id, 'OWNER_ONLY');

    // Mirrors the pond rule (PondsService.remove): a farm whose ponds have
    // held crops carries production history, and deleting it takes that with
    // it. Archive is the reversible action; delete is only for a farm that was
    // never really used. Crops carry `farm_id`, so this is one count rather
    // than a join through ponds.
    const cropCount = await this.farmsRepository.manager
      .getRepository(Crop)
      .count({ where: { farmId: id } });
    if (cropCount > 0) {
      throw new ConflictException({
        error: 'crop_history_exists',
        message: 'Cannot delete a farm with crop history — archive it instead',
      });
    }

    // Soft delete
    await this.farmsRepository.update(id, { deletedAt: new Date() });
    return { message: 'Farm deleted successfully' };
  }
}
