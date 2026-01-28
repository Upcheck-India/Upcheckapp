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

@Injectable()
export class AuthService {
    private supabase: SupabaseClient;
    private brevoApiKey: string;
    private brevoEmailSenderName: string;
    private brevoEmailSenderEmail: string;
    private brevoSmsSender: string;

    constructor(
        private configService: ConfigService,
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
        private otpRateLimitService: OtpRateLimitService,
    ) {
        this.supabase = createClient(
            this.configService.get<string>('SUPABASE_URL') || '',
            this.configService.get<string>('SUPABASE_ANON_KEY') || '',
        );
        this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || '';
        this.brevoEmailSenderName = this.configService.get<string>('BREVO_EMAIL_SENDER_NAME') || 'Upcheck';
        this.brevoEmailSenderEmail = this.configService.get<string>('BREVO_EMAIL_SENDER_EMAIL') || '';
        this.brevoSmsSender = this.configService.get<string>('BREVO_SMS_SENDER') || 'Upcheck';
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

        if (!this.brevoApiKey) {
            throw new BadRequestException('Brevo API key not configured');
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
            if (!this.brevoEmailSenderEmail) {
                throw new BadRequestException('Brevo email sender not configured');
            }
            await this.sendBrevoEmail(email, otp);
            await this.otpRepository.save(this.otpRepository.create({ email, code: otp, expiresAt }));
        }

        if (phone) {
            await this.sendBrevoSms(phone, otp);
            await this.otpRepository.save(this.otpRepository.create({ phone, code: otp, expiresAt }));
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

        const otpRecord = await this.otpRepository.findOne({
            where: email ? { email, code: token } : { phone, code: token },
            order: { createdAt: 'DESC' },
        });

        if (!otpRecord) {
            throw new UnauthorizedException('Invalid OTP');
        }

        if (otpRecord.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('OTP expired');
        }

        if (otpRecord.verifiedAt) {
            throw new UnauthorizedException('OTP already used');
        }

        otpRecord.verifiedAt = new Date();
        await this.otpRepository.save(otpRecord);

        return {
            verified: true,
            message: 'OTP verified successfully.',
        };
    }

    private generateOtp(): string {
        return randomInt(100000, 999999).toString();
    }

    getBrevoApiKey(): string {
        return this.brevoApiKey;
    }

    getBrevoEmailSender(): { name: string; email: string } | null {
        return this.brevoEmailSenderEmail ? { name: this.brevoEmailSenderName, email: this.brevoEmailSenderEmail } : null;
    }

    getBrevoSmsSender(): string | null {
        return this.brevoSmsSender || null;
    }

    private async sendBrevoEmail(email: string, otp: string) {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': this.brevoApiKey,
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: this.brevoEmailSenderName,
                    email: this.brevoEmailSenderEmail,
                },
                to: [{ email }],
                subject: 'Your OTP Code',
                textContent: `Your Upcheck verification code is ${otp}. It expires in 10 minutes.`,
            }),
        });

        if (!response.ok) {
            throw new BadRequestException('Failed to send email OTP');
        }
    }

    private async sendBrevoSms(phone: string, otp: string) {
        const response = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
            method: 'POST',
            headers: {
                'api-key': this.brevoApiKey,
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                sender: this.brevoSmsSender,
                recipient: phone,
                content: `Your Upcheck verification code is ${otp}. It expires in 10 minutes.`,
                type: 'transactional',
            }),
        });

        if (!response.ok) {
            throw new BadRequestException('Failed to send SMS OTP');
        }
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
