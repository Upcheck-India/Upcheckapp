import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { OtpCode } from './otp-code.entity';

@Injectable()
export class OtpRateLimitService {
    constructor(
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
    ) {}

    async checkDailyLimit(email?: string, phone?: string): Promise<boolean> {
        const target = email || phone;
        if (!target) return true;

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const count = await this.otpRepository.count({
            where: {
                ...(email ? { email } : { phone }),
                createdAt: MoreThanOrEqual(startOfDay),
            },
        });

        return count < 10; // max 10 OTPs per day per target
    }

    async checkResendCooldown(email?: string, phone?: string): Promise<boolean> {
        const target = email || phone;
        if (!target) return true;

        const recent = await this.otpRepository.findOne({
            where: {
                ...(email ? { email } : { phone }),
                createdAt: MoreThanOrEqual(new Date(Date.now() - 60 * 1000)),
            },
            order: { createdAt: 'DESC' },
        });

        return !recent;
    }
}
