import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto } from './dto';
import { OtpCode } from './otp-code.entity';
import { OtpRateLimitService } from './otp-rate-limit.service';
export declare class AuthService {
    private configService;
    private otpRepository;
    private otpRateLimitService;
    private supabase;
    private brevoApiKey;
    private brevoEmailSenderName;
    private brevoEmailSenderEmail;
    private brevoSmsSender;
    constructor(configService: ConfigService, otpRepository: Repository<OtpCode>, otpRateLimitService: OtpRateLimitService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        user: import("@supabase/supabase-js").AuthUser | null;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: import("@supabase/supabase-js").AuthUser;
    }>;
    sendOtp(sendOtpDto: SendOtpDto): Promise<{
        message: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        verified: boolean;
        message: string;
    }>;
    private generateOtp;
    getBrevoApiKey(): string;
    getBrevoEmailSender(): {
        name: string;
        email: string;
    } | null;
    getBrevoSmsSender(): string | null;
    private sendBrevoEmail;
    private sendBrevoSms;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string | undefined;
        refreshToken: string | undefined;
    }>;
    getUser(accessToken: string): Promise<import("@supabase/supabase-js").AuthUser>;
    logout(accessToken: string): Promise<{
        message: string;
    }>;
}
