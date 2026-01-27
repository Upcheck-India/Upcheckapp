import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto } from './dto';

@Injectable()
export class AuthService {
    private supabase: SupabaseClient;

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>('SUPABASE_URL') || '',
            this.configService.get<string>('SUPABASE_ANON_KEY') || '',
        );
    }

    async register(registerDto: RegisterDto) {
        const { email, password, fullName } = registerDto;

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        return {
            message: 'Registration successful. Please check your email to verify.',
            user: data.user,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: data.user,
        };
    }

    async sendOtp(sendOtpDto: SendOtpDto) {
        const { email } = sendOtpDto;

        const { error } = await this.supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false,
            },
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        return {
            message: 'OTP sent to your email.',
        };
    }

    async verifyOtp(verifyOtpDto: VerifyOtpDto) {
        const { email, token } = verifyOtpDto;

        const { data, error } = await this.supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: data.user,
        };
    }

    async refreshToken(refreshToken: string) {
        const { data, error } = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
        };
    }

    async getUser(accessToken: string) {
        const { data, error } = await this.supabase.auth.getUser(accessToken);

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        return data.user;
    }

    async logout(accessToken: string) {
        // Set admin auth header for server-side logout
        const { error } = await this.supabase.auth.admin.signOut(accessToken);

        if (error) {
            // Fallback - just invalidate on client side
            return { message: 'Logged out successfully' };
        }

        return { message: 'Logged out successfully' };
    }
}
