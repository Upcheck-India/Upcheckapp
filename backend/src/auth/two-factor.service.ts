import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from './user.entity';
import { RedisService } from '../redis/redis.service';

/**
 * TOTP-based two-factor authentication (otplib + qrcode).
 *
 * Enrolment is two-step so a secret is only persisted once the user proves
 * they can generate a valid code:
 *   1. `setup` — generate a secret, stash it in Redis (10 min TTL) and return
 *      the otpauth URI + a QR data-URL for the authenticator app.
 *   2. `enable` — verify a code against the pending secret, then persist it
 *      and flip `is2faEnabled`.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private static readonly PENDING_PREFIX = '2fa:pending:';
  private static readonly PENDING_TTL_SECONDS = 600;
  private static readonly ISSUER = 'Upcheck';
  // AUTH-4: single-use recovery codes. 8 uppercase-hex chars fits the
  // Login2faDto 6–9 char window so a backup code can be entered in the same
  // field as a TOTP code at the 2FA challenge.
  private static readonly BACKUP_CODE_COUNT = 10;
  private static readonly BCRYPT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  private async getUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setup(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
    const user = await this.getUser(userId);
    const secret = authenticator.generateSecret();
    const label = user.email || user.username || userId;
    const otpauthUrl = authenticator.keyuri(
      label,
      TwoFactorService.ISSUER,
      secret,
    );
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.redisService.set(
      `${TwoFactorService.PENDING_PREFIX}${userId}`,
      secret,
      'EX',
      TwoFactorService.PENDING_TTL_SECONDS,
    );

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async enable(
    userId: string,
    token: string,
  ): Promise<{ enabled: true; backupCodes: string[] }> {
    const secret = await this.redisService.get(
      `${TwoFactorService.PENDING_PREFIX}${userId}`,
    );
    if (!secret) {
      throw new BadRequestException('No pending 2FA setup. Call setup first.');
    }
    if (!authenticator.verify({ token, secret })) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const user = await this.getUser(userId);
    user.totpSecret = secret;
    user.is2faEnabled = true;
    const backupCodes = await this.generateAndStoreBackupCodes(user); // saves the user
    await this.redisService.del(`${TwoFactorService.PENDING_PREFIX}${userId}`);

    return { enabled: true, backupCodes };
  }

  async disable(userId: string, token: string): Promise<{ enabled: false }> {
    const user = await this.getUser(userId);
    if (!user.is2faEnabled || !user.totpSecret) {
      return { enabled: false };
    }
    if (!authenticator.verify({ token, secret: user.totpSecret })) {
      throw new UnauthorizedException('Invalid verification code');
    }
    user.is2faEnabled = false;
    user.totpSecret = null;
    user.backupCodes = [];
    await this.usersRepository.save(user);
    return { enabled: false };
  }

  /**
   * Re-issue backup codes for an already-enabled account (AUTH-4). Requires a
   * current TOTP code so a hijacked session can't silently mint recovery
   * codes. The old codes are replaced (invalidated) atomically.
   */
  async regenerateBackupCodes(
    userId: string,
    token: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.getUser(userId);
    if (!user.is2faEnabled || !user.totpSecret) {
      throw new BadRequestException(
        'Two-factor authentication is not enabled.',
      );
    }
    if (!authenticator.verify({ token, secret: user.totpSecret })) {
      throw new UnauthorizedException('Invalid verification code');
    }
    const backupCodes = await this.generateAndStoreBackupCodes(user);
    return { backupCodes };
  }

  /**
   * Generate a fresh batch of single-use recovery codes, persist their bcrypt
   * hashes on the user, and return the PLAINTEXT codes to be shown once.
   */
  private async generateAndStoreBackupCodes(user: User): Promise<string[]> {
    const codes: string[] = [];
    const hashes: string[] = [];
    for (let i = 0; i < TwoFactorService.BACKUP_CODE_COUNT; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase(); // 8 chars
      codes.push(code);
      hashes.push(await bcrypt.hash(code, TwoFactorService.BCRYPT_ROUNDS));
    }
    user.backupCodes = hashes;
    await this.usersRepository.save(user);
    return codes;
  }

  async status(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.getUser(userId);
    return { enabled: !!user.is2faEnabled };
  }

  /** True if the user has 2FA enabled (used to gate sign-in). */
  /**
   * Runs on EVERY successful login (password, OTP, Google, Truecaller —
   * see SupabaseAuthController.issueSessionOrChallenge) to decide whether a
   * 2FA challenge is required. Because this sits on that shared, unavoidable
   * path, a query failure here (e.g. schema drift — a migration adding a
   * `User` column landing in code before it's actually applied to the
   * database) must never crash the whole login. Fail safe: if we can't
   * determine 2FA status, treat the account as not requiring a challenge
   * rather than 500ing every login for every user. This is a deliberate,
   * temporary security tradeoff (a genuinely 2FA-enabled account would skip
   * its challenge during an outage like this) in exchange for not taking
   * down authentication entirely — the real fix is keeping the database
   * migrated in lockstep with the entity, not this fallback.
   */
  async isEnabled(userId: string): Promise<boolean> {
    try {
      const user = await this.usersRepository.findOneBy({ id: userId });
      return !!user?.is2faEnabled;
    } catch (err: any) {
      this.logger.error(
        `isEnabled() query failed for user ${userId} — treating as 2FA-disabled to avoid blocking login. ${err?.message}`,
      );
      return false;
    }
  }

  /** Verify a login code against the user's stored secret. */
  async verifyCode(userId: string, token: string): Promise<boolean> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user?.is2faEnabled || !user.totpSecret) return false;
    return authenticator.verify({ token, secret: user.totpSecret });
  }

  /**
   * Verify a 2FA login code, accepting EITHER the current TOTP code OR one
   * unused backup code (AUTH-4). A matched backup code is consumed (removed
   * from the stored array) so it can never be reused. Used by every 2FA
   * challenge path (login + password-reset).
   */
  async verifyCodeOrBackup(userId: string, token: string): Promise<boolean> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user?.is2faEnabled || !user.totpSecret) return false;
    if (authenticator.verify({ token, secret: user.totpSecret })) return true;

    // Backup-code path: consume the matched code atomically. Two concurrent
    // challenges submitting the SAME code (or two different codes) would
    // otherwise both read the array, both splice their own copy, and both
    // save() — accepting a single-use code twice / restoring an already-used
    // one (lost update). A pessimistic row lock serializes the read-modify-write.
    return this.usersRepository.manager.transaction(async (manager) => {
      const locked = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      const codes = locked?.backupCodes ?? [];
      for (let i = 0; i < codes.length; i++) {
        if (await bcrypt.compare(token, codes[i])) {
          codes.splice(i, 1); // single-use: consume it
          locked!.backupCodes = codes;
          await manager.save(locked!);
          return true;
        }
      }
      return false;
    });
  }
}
