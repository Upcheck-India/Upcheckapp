import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto } from './dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        user: import("@supabase/auth-js").User | null;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: import("@supabase/auth-js").User;
    }>;
    sendOtp(sendOtpDto: SendOtpDto): Promise<{
        message: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        verified: boolean;
        message: string;
    }>;
    health(): {
        brevo: {
            apiKeyConfigured: boolean;
            emailSenderConfigured: boolean;
            smsSenderConfigured: boolean;
        };
        status: string;
    };
    loginWithOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        verified: boolean;
        message: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string | undefined;
        refreshToken: string | undefined;
    }>;
    getMe(user: any): any;
    logout(auth: string): Promise<{
        message: string;
    }>;
}
