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
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { AddMemberDto } from './dto/add-member.dto';

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

    /** Add a worker to a farm. Owner-only. */
    async addMember(farmId: string, callerId: string, dto: AddMemberDto) {
        await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'OWNER_ONLY');

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
            role: dto.role ?? 'worker',
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

    /** Remove a member. Owner-only; the primary owner cannot be removed. */
    async removeMember(farmId: string, callerId: string, targetUserId: string) {
        await this.farmAccess.assertCanAccessFarm(callerId, farmId, 'OWNER_ONLY');

        const farm = await this.farmsRepo.findOne({ where: { id: farmId } });
        if (farm && farm.userId === targetUserId) {
            throw new BadRequestException('The farm owner cannot be removed');
        }

        const member = await this.membersRepo.findOne({ where: { farmId, userId: targetUserId } });
        if (!member) {
            throw new NotFoundException('Membership not found');
        }
        if (member.role === 'owner') {
            throw new ForbiddenException('Owners cannot be removed');
        }
        await this.membersRepo.delete({ id: member.id });
        return { message: 'Member removed' };
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
