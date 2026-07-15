import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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
  ) {}

  create(createProfileDto: CreateProfileDto) {
    // In a real app, ID typically comes from Auth (Supabase Auth ID)
    // For now, we assume the DTO or logic handles ID generation/assignment
    // NOTE: Profiles are typically created via triggers, but we support manual creation if needed
    const profile = this.profilesRepository.create(createProfileDto);
    return this.profilesRepository.save(profile);
  }

  findOne(id: string) {
    return this.profilesRepository.findOneBy({ id });
  }

  findByUsername(username: string) {
    return this.profilesRepository.findOneBy({ username });
  }

  async findPublicByUsername(
    username: string,
  ): Promise<Partial<Profile> | null> {
    const profile = await this.profilesRepository.findOne({
      where: { username },
      select: [
        'id',
        'username',
        'fullName',
        'avatarUrl',
        'website',
        'createdAt',
      ] as any,
    });
    return profile ?? null;
  }

  async upsert(
    id: string,
    email: string,
    fullName?: string,
    username?: string,
  ): Promise<Profile> {
    let profile = await this.profilesRepository.findOneBy({ id });
    if (!profile) {
      const generated =
        username || `user_${id.replace(/-/g, '').substring(0, 10)}`;
      try {
        profile = this.profilesRepository.create({
          id,
          email,
          fullName: fullName || '',
          username: generated,
        });
        await this.profilesRepository.save(profile);
      } catch (err: any) {
        if (err?.message?.includes('email') || err?.code === '42703') {
          profile = this.profilesRepository.create({
            id,
            fullName: fullName || '',
            username: generated,
          });
          await this.profilesRepository.save(profile);
        } else if (err?.code === '23505') {
          const clean = `${generated}_${id.substring(0, 4)}`;
          profile = this.profilesRepository.create({
            id,
            email,
            fullName: fullName || '',
            username: clean,
          });
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
        } catch {
          /* email column may not exist yet */
        }
      }
    }
    return profile;
  }

  async update(id: string, updateProfileDto: UpdateProfileDto) {
    await this.profilesRepository.update(id, updateProfileDto);
    return this.findOne(id);
  }

  async deleteAccount(userId: string, password?: string): Promise<void> {
    // Strict re-authentication for password accounts before this irreversible
    // action. A valid access token alone must NOT be enough to permanently
    // destroy an account and every farm/pond/log it owns — a leaked or stolen
    // token would otherwise be catastrophic. Google/Truecaller/phone accounts
    // have no password to verify; for those the client's typed-confirmation
    // gate is the strict step (there is no server-side secret to re-check).
    const authUser = await this.supabaseAuthService.getUserById(userId);
    const identities = (authUser as { identities?: { provider?: string }[] })
      ?.identities ?? [];
    const hasPasswordIdentity = identities.some((i) => i.provider === 'email');
    if (hasPasswordIdentity) {
      if (!password) {
        throw new UnauthorizedException(
          'Your password is required to delete your account.',
        );
      }
      if (!authUser?.email) {
        throw new BadRequestException('This account has no email to verify.');
      }
      await this.supabaseAuthService.verifyPassword(authUser.email, password);
    }

    // Remove the Supabase auth identity FIRST and let a failure abort the
    // request. If we wiped local data first and the auth delete then failed,
    // the auth.users row would survive: the user could still sign in, and the
    // on_auth_user_updated mirror trigger (supabase_setup.sql) would re-INSERT
    // a fresh public.users row — a "deleted" account that resurrects itself
    // and can still authenticate. Deleting auth first makes deletion truthful.
    await this.supabaseAuthService.deleteUser(userId);

    // Then remove all locally-owned data. Deleting the `users` row cascades to
    // farms → ponds → crops → all operational logs via ON DELETE CASCADE.
    // `profiles` and `credit_ledgers` have NO foreign key to users, so they
    // must be deleted explicitly or they orphan (leaking dealer/debt PII).
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM credit_ledgers WHERE user_id = $1`, [
        userId,
      ]);
      await manager.query(`DELETE FROM users WHERE id = $1`, [userId]);
      await manager.query(`DELETE FROM profiles WHERE id = $1`, [userId]);
    });
  }
}
