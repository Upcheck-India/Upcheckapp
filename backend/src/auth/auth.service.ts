import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { LessThan } from 'typeorm';
import { RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto } from './dto';
import { OtpCode } from './otp-code.entity';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
    private supabase: SupabaseClient;

    constructor(
        private configService: ConfigService,
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
        private otpRateLimitService: OtpRateLimitService,
        private mailService: MailService,
    ) {
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
        const { email, phone } = sendOtpDto;

        if (!email && !phone) {
            throw new BadRequestException('Email or phone is required');
        }

        if (!(await this.otpRateLimitService.checkDailyLimit(email, phone))) {
            throw new BadRequestException('Daily OTP limit exceeded. Please try again tomorrow.');
        }

        if (!(await this.otpRateLimitService.checkResendCooldown(email, phone))) {
            throw new BadRequestException('Please wait before requesting another OTP.');
        }

        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        if (email) {
            await this.mailService.sendOtpEmail(email, otp);
            await this.otpRepository.save(this.otpRepository.create({ email, code: otp, expiresAt }));
        }

        if (phone) {
            // TODO: Implement SMS sending via a dedicated SMS service
            throw new BadRequestException('SMS OTP is not yet supported');
        }

        return {
            message: 'OTP sent successfully.',
        };
    }

    async verifyOtp(verifyOtpDto: VerifyOtpDto) {
        const { email, phone, token } = verifyOtpDto;

        if (!email && !phone) {
            throw new BadRequestException('Email or phone is required');
        }

        const latestOtp = await this.otpRepository.findOne({
            where: email ? { email } : { phone },
            order: { createdAt: 'DESC' },
        });

        if (!latestOtp) {
            throw new UnauthorizedException('Invalid OTP');
        }

        if (latestOtp.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('OTP expired');
        }

        if (latestOtp.verifiedAt) {
            throw new UnauthorizedException('OTP already used');
        }

        if (latestOtp.failedAttempts >= 5) {
            throw new UnauthorizedException('Too many failed attempts. Please request a new OTP.');
        }

        if (latestOtp.code !== token) {
            latestOtp.failedAttempts += 1;
            await this.otpRepository.save(latestOtp);
            throw new UnauthorizedException('Invalid OTP');
        }

        latestOtp.verifiedAt = new Date();
        await this.otpRepository.save(latestOtp);

        return {
            verified: true,
            message: 'OTP verified successfully.',
        };
    }

    private generateOtp(): string {
        return randomInt(100000, 999999).toString();
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
