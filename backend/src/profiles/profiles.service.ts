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
import { AvatarService } from '../avatars/avatar.service';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    private dataSource: DataSource,
    private readonly supabaseAuthService: SupabaseAuthService,
    private readonly avatars: AvatarService,
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
      // No createdAt: profiles has no such column, and selecting it made
      // TypeORM throw on every public profile lookup. No avatarUrl: a
      // profile picture is never public (AvatarService decides who sees it).
      select: ['id', 'username', 'fullName', 'website'],
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
    // Signup never wrote a name here (fullName ''), so every email account
    // showed no name. Heal from users.first/last_name, which the signup
    // trigger does fill — on creation, and for existing rows on next read.
    if (!fullName && !profile?.fullName) {
      fullName = (await this.nameFromUsers(id)) || fullName;
      if (profile && fullName) {
        profile.fullName = fullName;
        await this.profilesRepository.save(profile);
      }
    }
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

  private async nameFromUsers(id: string): Promise<string> {
    const rows: { first_name: string | null; last_name: string | null }[] =
      await this.dataSource.query(
        `SELECT first_name, last_name FROM users WHERE id = $1`,
        [id],
      );
    return [rows[0]?.first_name, rows[0]?.last_name]
      .map((p) => (p ?? '').trim())
      .filter(Boolean)
      .join(' ');
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
    // Profile pictures go before anything else is deleted: if R2 refuses,
    // the request fails and can be retried, rather than the account vanishing
    // with the photos left behind.
    await this.avatars.purgeUser(userId);

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

  /**
   * The only preference keys a client may write. Anything else in the body is
   * dropped rather than merged.
   *
   * `users.preferences` is free-form jsonb, so merging whatever arrives would
   * let a caller write `{ roles: ["admin"] }` onto their own row. That is
   * harmless today — nothing reads preferences for authorization — and a latent
   * privilege escalation the moment somebody does. W3 already had to remove one
   * client-supplied flag (`accountType`) that had been wired into an
   * authorization check; this whitelist, and
   * `preferences-not-authorization.spec.ts`, are what stop this becoming the
   * second.
   */
  private static readonly WRITABLE_PREFERENCE_KEYS = [
    'onboardingIntent',
  ] as const;

  /** Current preferences for a user, defaulting to {} when the row has none. */
  async getPreferences(userId: string): Promise<Record<string, unknown>> {
    const rows: { preferences: Record<string, unknown> | null }[] =
      await this.dataSource.query(
        `SELECT preferences FROM users WHERE id = $1`,
        [userId],
      );
    return rows[0]?.preferences ?? {};
  }

  /**
   * Merge whitelisted keys into one user's preferences.
   *
   * Merge rather than replace, and merged in SQL rather than read-modify-write:
   * `jsonb || jsonb` is applied by Postgres inside the statement, so a
   * concurrent write to a different key cannot be silently lost between our
   * read and our write.
   *
   * An explicit `null` DELETES the key rather than merging it. There has to be
   * a way to say "forget this", and `undefined` cannot be it: `undefined` does
   * not survive `JSON.stringify` on the client, so a clear request arrived as
   * an empty body and wrote nothing. That silently stranded every owner who
   * finished farm setup — the intent stayed on the row and the app re-armed the
   * first-run gate from it on every launch. Deleting rather than storing a null
   * keeps `getPreferences` answering with absent-means-absent.
   */
  async setPreferences(
    userId: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const allowed: Record<string, unknown> = {};
    const removed: string[] = [];
    for (const key of ProfilesService.WRITABLE_PREFERENCE_KEYS) {
      if (patch[key] === null) removed.push(key);
      else if (patch[key] !== undefined) allowed[key] = patch[key];
    }
    // Nothing writable was sent — return what is stored rather than issuing an
    // UPDATE that would only bump updated_at.
    if (Object.keys(allowed).length === 0 && removed.length === 0) {
      return this.getPreferences(userId);
    }

    // Merge then subtract, in one statement so it stays atomic.
    const rows: { preferences: Record<string, unknown> }[] =
      await this.dataSource.query(
        `UPDATE users
            SET preferences =
                  (COALESCE(preferences, '{}'::jsonb) || $2::jsonb) - $3::text[]
          WHERE id = $1
      RETURNING preferences`,
        [userId, JSON.stringify(allowed), removed],
      );
    return rows[0]?.preferences ?? allowed;
  }
}
