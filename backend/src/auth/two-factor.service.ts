import {
    Injectable,
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
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
    private static readonly PENDING_PREFIX = '2fa:pending:';
    private static readonly PENDING_TTL_SECONDS = 600;
    private static readonly ISSUER = 'Upcheck';

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        private readonly redisService: RedisService,
    ) { }

    private async getUser(userId: string): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async setup(userId: string): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
        const user = await this.getUser(userId);
        const secret = authenticator.generateSecret();
        const label = user.email || user.username || userId;
        const otpauthUrl = authenticator.keyuri(label, TwoFactorService.ISSUER, secret);
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        await this.redisService.set(
            `${TwoFactorService.PENDING_PREFIX}${userId}`,
            secret,
            'EX',
            TwoFactorService.PENDING_TTL_SECONDS,
        );

        return { secret, otpauthUrl, qrCodeDataUrl };
    }

    async enable(userId: string, token: string): Promise<{ enabled: true }> {
        const secret = await this.redisService.get(`${TwoFactorService.PENDING_PREFIX}${userId}`);
        if (!secret) {
            throw new BadRequestException('No pending 2FA setup. Call setup first.');
        }
        if (!authenticator.verify({ token, secret })) {
            throw new UnauthorizedException('Invalid verification code');
        }

        const user = await this.getUser(userId);
        user.totpSecret = secret;
        user.is2faEnabled = true;
        await this.usersRepository.save(user);
        await this.redisService.del(`${TwoFactorService.PENDING_PREFIX}${userId}`);

        return { enabled: true };
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
        await this.usersRepository.save(user);
        return { enabled: false };
    }

    async status(userId: string): Promise<{ enabled: boolean }> {
        const user = await this.getUser(userId);
        return { enabled: !!user.is2faEnabled };
    }

    /** True if the user has 2FA enabled (used to gate sign-in). */
    async isEnabled(userId: string): Promise<boolean> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        return !!user?.is2faEnabled;
    }

    /** Verify a login code against the user's stored secret. */
    async verifyCode(userId: string, token: string): Promise<boolean> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user?.is2faEnabled || !user.totpSecret) return false;
        return authenticator.verify({ token, secret: user.totpSecret });
    }
}
