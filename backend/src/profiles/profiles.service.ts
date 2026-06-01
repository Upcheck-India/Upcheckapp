import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseAuthService } from '../auth/supabase-auth.service';

@Injectable()
export class ProfilesService {
    private readonly logger = new Logger(ProfilesService.name);

    constructor(
        @InjectRepository(Profile)
        private profilesRepository: Repository<Profile>,
        private dataSource: DataSource,
        private readonly supabaseAuthService: SupabaseAuthService,
    ) { }

    create(createProfileDto: CreateProfileDto) {
        // In a real app, ID typically comes from Auth (Supabase Auth ID)
        // For now, we assume the DTO or logic handles ID generation/assignment
        // NOTE: Profiles are typically created via triggers, but we support manual creation if needed
        const profile = this.profilesRepository.create(createProfileDto);
        return this.profilesRepository.save(profile);
    }

    findAll() {
        return this.profilesRepository.find();
    }

    findOne(id: string) {
        return this.profilesRepository.findOneBy({ id });
    }

    findByUsername(username: string) {
        return this.profilesRepository.findOneBy({ username });
    }

    async findPublicByUsername(username: string): Promise<Partial<Profile> | null> {
        const profile = await this.profilesRepository.findOne({
            where: { username },
            select: ['id', 'username', 'fullName', 'avatarUrl', 'website', 'createdAt'] as any,
        });
        return profile ?? null;
    }

    async upsert(id: string, email: string, fullName?: string, username?: string): Promise<Profile> {
        let profile = await this.profilesRepository.findOneBy({ id });
        if (!profile) {
            const generated = username || `user_${id.replace(/-/g, '').substring(0, 10)}`;
            try {
                profile = this.profilesRepository.create({ id, email, fullName: fullName || '', username: generated });
                await this.profilesRepository.save(profile);
            } catch (err: any) {
                if (err?.message?.includes('email') || err?.code === '42703') {
                    profile = this.profilesRepository.create({ id, fullName: fullName || '', username: generated });
                    await this.profilesRepository.save(profile);
                } else if (err?.code === '23505') {
                    const clean = `${generated}_${id.substring(0, 4)}`;
                    profile = this.profilesRepository.create({ id, email, fullName: fullName || '', username: clean });
                    await this.profilesRepository.save(profile);
                } else {
                    throw err;
                }
            }
        } else {
            if (!profile.email && email) {
                try {
                    profile.email = email;
                    await this.profilesRepository.save(profile);
                } catch { /* email column may not exist yet */ }
            }
        }
        return profile;
    }

    async update(id: string, updateProfileDto: UpdateProfileDto) {
        await this.profilesRepository.update(id, updateProfileDto);
        return this.findOne(id);
    }

    async deleteAccount(userId: string): Promise<void> {
        // Remove all locally-owned data first. Deleting the `users` row cascades
        // to farms → ponds → crops → all operational logs via ON DELETE CASCADE
        // foreign keys; `profiles` is deleted explicitly (no FK to users).
        await this.dataSource.transaction(async (manager) => {
            await manager.query(`DELETE FROM users WHERE id = $1`, [userId]);
            await manager.query(`DELETE FROM profiles WHERE id = $1`, [userId]);
        });

        // Finally remove the Supabase auth identity so the account can no longer
        // sign in. Local data is already gone, so a failure here is logged but
        // does not fail the request.
        try {
            await this.supabaseAuthService.deleteUser(userId);
        } catch (err: any) {
            this.logger.error(
                `Local data for ${userId} deleted, but Supabase auth user removal failed: ${err?.message ?? err}`,
            );
        }
    }
}
