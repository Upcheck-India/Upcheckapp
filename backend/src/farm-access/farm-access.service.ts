import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { FarmMember, FarmRole } from './farm-member.entity';
import { Farm } from '../farms/farm.entity';
import { Pond } from '../ponds/pond.entity';
import { FarmCapability, roleSatisfies } from './farm-capability';

/**
 * Postgres "undefined_table" (42P01) — raised when the `farm_members` table
 * doesn't exist yet (the CreateFarmMembers migration hasn't been run). Lets the
 * app degrade to owner-only access during a deploy-before-migrate window instead
 * of hard-failing every farm-scoped request.
 */
function isMissingTable(err: any): boolean {
    return (err?.code ?? err?.driverError?.code) === '42P01';
}

/**
 * FarmAccessService — the single source of truth for "can this user perform an
 * action of capability C on this farm/pond?". Both the OwnershipGuard (route
 * layer) and the member-aware service methods delegate here, so the owner/worker
 * policy lives in one place.
 *
 * Depends only on repositories (FarmMember / Farm / Pond) — NOT on FarmsService
 * or PondsService — to avoid circular module dependencies.
 */
@Injectable()
export class FarmAccessService {
    private readonly logger = new Logger(FarmAccessService.name);

    constructor(
        @InjectRepository(FarmMember)
        private readonly membersRepo: Repository<FarmMember>,
        @InjectRepository(Farm)
        private readonly farmsRepo: Repository<Farm>,
        @InjectRepository(Pond)
        private readonly pondsRepo: Repository<Pond>,
    ) {}

    /**
     * Resolve a user's role on a farm. Returns null if they are not a member.
     * Defensive fallback: if the farm's primary owner column matches the user
     * but no membership row exists (e.g. pre-backfill data), treat as owner.
     */
    async getRoleOnFarm(userId: string, farmId: string): Promise<FarmRole | null> {
        try {
            const member = await this.membersRepo.findOne({ where: { farmId, userId } });
            if (member) return member.role;
        } catch (err) {
            if (!isMissingTable(err)) throw err;
            this.logger.warn('farm_members table missing — run migrations; using owner-only access');
        }

        const farm = await this.farmsRepo.findOne({
            where: { id: farmId },
            select: { id: true, userId: true },
        });
        if (farm && farm.userId === userId) return 'owner';
        return null;
    }

    /** Farm ids the user can access (owner or worker), excluding soft-deleted farms. */
    async getAccessibleFarmIds(userId: string): Promise<string[]> {
        let memberFarmIds: string[] = [];
        try {
            const members = await this.membersRepo.find({
                where: { userId },
                select: { farmId: true },
            });
            memberFarmIds = members.map((m) => m.farmId);
        } catch (err) {
            if (!isMissingTable(err)) throw err;
            this.logger.warn('farm_members table missing — run migrations; listing owned farms only');
        }

        // Defensive union with the legacy owner column, in case any farm lacks a
        // backfilled membership row.
        const owned = await this.farmsRepo.find({
            where: { userId, deletedAt: IsNull() },
            select: { id: true },
        });
        const ownedIds = owned.map((f) => f.id);

        const all = new Set([...memberFarmIds, ...ownedIds]);
        if (all.size === 0) return [];

        // Filter out soft-deleted farms (membership rows may point at them).
        const live = await this.farmsRepo.find({
            where: { deletedAt: IsNull() },
            select: { id: true },
        });
        const liveIds = new Set(live.map((f) => f.id));
        return [...all].filter((id) => liveIds.has(id));
    }

    /**
     * Farm ids where the user's role satisfies `capability` — e.g. the farms
     * whose financials a manager/owner may read. Used to scope list endpoints
     * (transactions, reports) without leaking other roles' farms.
     */
    async getFarmIdsWithCapability(userId: string, capability: FarmCapability): Promise<string[]> {
        const accessibleIds = await this.getAccessibleFarmIds(userId);
        const allowed: string[] = [];
        for (const farmId of accessibleIds) {
            const role = await this.getRoleOnFarm(userId, farmId);
            if (roleSatisfies(role, capability)) allowed.push(farmId);
        }
        return allowed;
    }

    /**
     * Throw unless `userId` may perform `capability` on `farmId`. Mirrors the
     * existing `farmsService.verifyOwnership` behaviour: a soft-deleted or
     * missing farm yields NotFoundException. Returns the (live) farm on success.
     */
    async assertCanAccessFarm(userId: string, farmId: string, capability: FarmCapability): Promise<Farm> {
        const farm = await this.farmsRepo.findOne({ where: { id: farmId } });
        if (!farm || farm.deletedAt) {
            throw new NotFoundException(`Farm with ID ${farmId} not found`);
        }
        const role = await this.getRoleOnFarm(userId, farmId);
        if (!roleSatisfies(role, capability)) {
            throw new ForbiddenException('You do not have permission to perform this action on this farm');
        }
        return farm;
    }

    /** Pond-scoped variant — resolves the pond's farm, then delegates. */
    async assertCanAccessPond(userId: string, pondId: string, capability: FarmCapability): Promise<Pond> {
        const pond = await this.pondsRepo.findOne({ where: { id: pondId } });
        if (!pond) {
            throw new NotFoundException(`Pond with ID ${pondId} not found`);
        }
        await this.assertCanAccessFarm(userId, pond.farmId, capability);
        return pond;
    }
}
