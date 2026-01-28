import { Repository } from 'typeorm';
import { OtpCode } from './otp-code.entity';
export declare class OtpCleanupService {
    private otpRepository;
    constructor(otpRepository: Repository<OtpCode>);
    cleanupExpiredOtps(): Promise<void>;
}
