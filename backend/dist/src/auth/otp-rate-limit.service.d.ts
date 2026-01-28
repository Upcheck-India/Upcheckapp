import { Repository } from 'typeorm';
import { OtpCode } from './otp-code.entity';
export declare class OtpRateLimitService {
    private otpRepository;
    constructor(otpRepository: Repository<OtpCode>);
    checkDailyLimit(email?: string, phone?: string): Promise<boolean>;
    checkResendCooldown(email?: string, phone?: string): Promise<boolean>;
}
