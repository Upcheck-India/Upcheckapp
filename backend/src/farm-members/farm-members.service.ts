import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmMember } from '../farm-access/farm-member.entity';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { canAssignRole, canManageMember } from '../farm-access/farm-capability';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { AddMemberDto, AssignableRole } from './dto/add-member.dto';

/** Public-safe view of a user (never exposes auth/email/phone beyond display). */
export interface PublicUser {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
}

const toPublicUser = (u: User): PublicUser => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    avatarUrl: u.avatarUrl,
});

@Injectable()
export class FarmMembersService {
    constructor(
        @InjectRepository(FarmMember)
        private readonly membersRepo: Repository<FarmMember>,
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>,
        @InjectRepository(Farm)
        private readonly farmsRepo: Repository<Farm>,
        private readonly farmAccess: FarmAccessService,
    ) {}

    /** Resolve one user by unique id (QR payload), else phone, else email. */
    async lookupUser(query: { userId?: string; phone?: string; email?: string }): Promise<PublicUser> {
        let user: User | null = null;
        if (query.userId) {
            user = await this.usersRepo.findOne({ where: { id: query.userId } });
        }
        if (!user && query.phone) {
            user = await this.usersRepo.findOne({ where: { phone: query.phone } });
        }
        if (!user && query.email) {
            user = await this.usersRepo.findOne({ where: { email: query.email.toLowerCase() } });
        }
        if (!user) {
            throw new NotFoundException('No user found for the provided identifier');
        }
        return toPublicUser(user);
    }

    /**
     * Add a member to a farm. Owner may add manager/worker/viewer; manager may
     * add workers only (enforced via canAssignRole). Defaults to 'worker'.
     */
    async addMember(farmId: string, callerId: string, dto: AddMemberDto) {
        // Must at least be able to manage workers (owner or manager) and the farm must exist/be live.
        await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'MANAGE_WORKERS');

        const callerRole = await this.farmAccess.getRoleOnFarm(callerId, farmId);
        const targetRole = dto.role ?? 'worker';
        if (!canAssignRole(callerRole, targetRole)) {
            throw new ForbiddenException(
                `Your role (${callerRole ?? 'none'}) cannot assign the "${targetRole}" role`,
            );
        }

        const target = await this.usersRepo.findOne({ where: { id: dto.userId } });
        if (!target) {
            throw new NotFoundException('User to add was not found');
        }

        const farm = await this.farmsRepo.findOne({ where: { id: farmId } });
        if (target.id === farm?.userId) {
            throw new ConflictException('This user is the farm owner');
        }

        const existing = await this.membersRepo.findOne({ where: { farmId, userId: dto.userId } });
        if (existing) {
            throw new ConflictException('User is already a member of this farm');
        }

        const member = this.membersRepo.create({
            farmId,
            userId: dto.userId,
            role: targetRole,
            addedById: callerId,
        });
        await this.membersRepo.save(member);
        return { ...member, user: toPublicUser(target) };
    }

    /** List members of a farm (any member may view). */
    async listMembers(farmId: string, callerId: string) {
        await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'READ');
        const members = await this.membersRepo.find({
            where: { farmId },
            relations: ['user'],
            order: { role: 'ASC', createdAt: 'ASC' },
        });
        return members.map((m) => ({
            id: m.id,
            farmId: m.farmId,
            userId: m.userId,
            role: m.role,
            createdAt: m.createdAt,
            user: m.user ? toPublicUser(m.user) : null,
        }));
    }

    /**
     * Remove a member. Owner may remove manager/worker/viewer; manager may
     * remove workers only (canManageMember). The primary owner cannot be removed.
     */
    async removeMember(farmId: string, callerId: string, targetUserId: string) {
        await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'MANAGE_WORKERS');

        const farm = await this.farmsRepo.findOne({ where: { id: farmId } });
        if (farm && farm.userId === targetUserId) {
            throw new BadRequestException('The farm owner cannot be removed');
        }

        const member = await this.membersRepo.findOne({ where: { farmId, userId: targetUserId } });
        if (!member) {
            throw new NotFoundException('Membership not found');
        }

        const callerRole = await this.farmAccess.getRoleOnFarm(callerId, farmId);
        if (!canManageMember(callerRole, member.role)) {
            throw new ForbiddenException(
                `Your role (${callerRole ?? 'none'}) cannot remove a "${member.role}" member`,
            );
        }

        await this.membersRepo.delete({ id: member.id });
        return { message: 'Member removed' };
    }

    /** Change a member's role. Owner only (blueprint §28). */
    async changeMemberRole(
        farmId: string,
        callerId: string,
        targetUserId: string,
        newRole: AssignableRole,
    ) {
        await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'OWNER_ONLY');

        const farm = await this.farmsRepo.findOne({ where: { id: farmId } });
        if (farm && farm.userId === targetUserId) {
            throw new BadRequestException("The owner's role is changed via ownership transfer");
        }

        const member = await this.membersRepo.findOne({ where: { farmId, userId: targetUserId } });
        if (!member) {
            throw new NotFoundException('Membership not found');
        }
        if (member.role === 'owner') {
            throw new ForbiddenException('Use ownership transfer to change an owner');
        }

        const callerRole = await this.farmAccess.getRoleOnFarm(callerId, farmId);
        if (!canAssignRole(callerRole, newRole)) {
            throw new ForbiddenException(`Your role cannot assign the "${newRole}" role`);
        }

        member.role = newRole;
        await this.membersRepo.save(member);
        return { farmId, userId: targetUserId, role: newRole };
    }

    /**
     * Transfer farm ownership to an existing member. Owner only. The new owner
     * must already be a member; the outgoing owner is demoted to manager. The
     * farm.userId and both membership rows update atomically.
     * NOTE: OTP re-verification (blueprint §28.6) is layered on in the
     * security-hardening pass (Stage 5).
     */
    async transferOwnership(farmId: string, callerId: string, newOwnerUserId: string) {
        await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'OWNER_ONLY');
        if (newOwnerUserId === callerId) {
            throw new BadRequestException('You already own this farm');
        }

        const farm = await this.farmsRepo.findOne({ where: { id: farmId } });
        if (!farm) {
            throw new NotFoundException('Farm not found');
        }

        const newOwnerMember = await this.membersRepo.findOne({
            where: { farmId, userId: newOwnerUserId },
        });
        if (!newOwnerMember) {
            throw new BadRequestException('The new owner must already be a member of this farm');
        }

        await this.membersRepo.manager.transaction(async (mgr) => {
            newOwnerMember.role = 'owner';
            await mgr.save(newOwnerMember);

            // Demote the outgoing owner's membership to manager (create the row
            // if the legacy owner never had an explicit membership).
            let callerMember = await mgr.findOne(FarmMember, { where: { farmId, userId: callerId } });
            if (callerMember) {
                callerMember.role = 'manager';
            } else {
                callerMember = mgr.create(FarmMember, {
                    farmId,
                    userId: callerId,
                    role: 'manager',
                    addedById: callerId,
                });
            }
            await mgr.save(callerMember);

            farm.userId = newOwnerUserId;
            await mgr.save(farm);
        });

        return { message: 'Ownership transferred', farmId, newOwnerUserId };
    }

    /** Farms the caller belongs to (owner or worker), with their role. */
    async listMine(callerId: string) {
        const members = await this.membersRepo.find({
            where: { userId: callerId },
            relations: ['farm'],
        });
        return members
            .filter((m) => m.farm && !m.farm.deletedAt)
            .map((m) => ({
                farmId: m.farmId,
                role: m.role,
                farm: m.farm ? { id: m.farm.id, name: m.farm.name, farmCode: m.farm.farmCode } : null,
            }));
    }
}
