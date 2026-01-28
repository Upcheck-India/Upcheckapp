import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OtpCode } from './otp-code.entity';

@Injectable()
export class OtpCleanupService {
    constructor(
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredOtps() {
        await this.otpRepository.delete({
            expiresAt: LessThan(new Date()),
        });
    }
}
