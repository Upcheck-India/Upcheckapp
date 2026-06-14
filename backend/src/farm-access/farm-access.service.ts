import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { FarmMember, FarmRole } from './farm-member.entity';
import { Farm } from '../farms/farm.entity';
import { Pond } from '../ponds/pond.entity';
import { FarmCapability, roleSatisfies } from './farm-capability';

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
        const member = await this.membersRepo.findOne({ where: { farmId, userId } });
        if (member) return member.role;

        const farm = await this.farmsRepo.findOne({
            where: { id: farmId },
            select: { id: true, userId: true },
        });
        if (farm && farm.userId === userId) return 'owner';
        return null;
    }

    /** Farm ids the user can access (owner or worker), excluding soft-deleted farms. */
    async getAccessibleFarmIds(userId: string): Promise<string[]> {
        const members = await this.membersRepo.find({
            where: { userId },
            select: { farmId: true },
        });
        const memberFarmIds = members.map((m) => m.farmId);

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
