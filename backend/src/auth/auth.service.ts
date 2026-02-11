import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto } from './dto';
import { OtpCode } from './otp-code.entity';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
    private supabase: SupabaseClient;
    private supabaseAdmin: SupabaseClient;

    constructor(
        private configService: ConfigService,
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
        private otpRateLimitService: OtpRateLimitService,
        private mailService: MailService,
    ) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
        const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
        this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }

    // ─── Registration ────────────────────────────────────────────────
    async register(registerDto: RegisterDto) {
        const { email, password, fullName } = registerDto;

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
            },
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        return {
            message: 'Registration successful.',
            user: data.user,
        };
    }

    // ─── Password Login ──────────────────────────────────────────────
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
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
            user: data.user,
        };
    }

    // ─── Send OTP ────────────────────────────────────────────────────
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
            await this.otpRepository.save(
                this.otpRepository.create({ email, code: otp, expiresAt }),
            );
        }

        if (phone) {
            throw new BadRequestException('SMS OTP is not yet supported');
        }

        return { message: 'OTP sent successfully.' };
    }

    // ─── Verify OTP ──────────────────────────────────────────────────
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

        return { verified: true, message: 'OTP verified successfully.' };
    }

    // ─── Login With OTP (creates user if needed + returns session) ──
    async loginWithOtp(verifyOtpDto: VerifyOtpDto) {
        // Step 1: Verify the OTP
        await this.verifyOtp(verifyOtpDto);

        const { email } = verifyOtpDto;
        if (!email) {
            throw new BadRequestException('Email is required for OTP login');
        }

        // Step 2: Find or create the user in Supabase
        let userId: string | undefined;

        // Try to find existing user by email
        const { data: usersData } = await this.supabaseAdmin.auth.admin.listUsers() as any;
        const existingUser = (usersData?.users || []).find(
            (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
        );

        if (existingUser) {
            userId = existingUser.id;
        } else {
            // Create a new user (no password — OTP-only user)
            const tempPassword = `otp_${randomInt(100000000, 999999999)}_${Date.now()}`;
            const { data: newUser, error: createError } =
                await this.supabaseAdmin.auth.admin.createUser({
                    email,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: { auth_method: 'otp' },
                });

            if (createError) {
                throw new BadRequestException(
                    `Failed to create account: ${createError.message}`,
                );
            }
            userId = newUser.user?.id;
        }

        if (!userId) {
            throw new BadRequestException('Failed to resolve user account');
        }

        // Step 3: Generate a magic link and extract session tokens
        const { data: linkData, error: linkError } =
            await this.supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email,
            });

        if (linkError || !linkData) {
            throw new BadRequestException(
                `Failed to generate session: ${linkError?.message || 'Unknown error'}`,
            );
        }

        // Step 4: Use the OTP from the magic link to sign in and get session tokens
        const { data: sessionData, error: sessionError } =
            await this.supabase.auth.verifyOtp({
                email,
                token: linkData.properties.hashed_token,
                type: 'email',
            });

        if (sessionError || !sessionData.session) {
            // Fallback: try magiclink type
            const { data: fallbackData, error: fallbackError } =
                await this.supabase.auth.verifyOtp({
                    email,
                    token: linkData.properties.hashed_token,
                    type: 'magiclink',
                });

            if (fallbackError || !fallbackData.session) {
                throw new BadRequestException(
                    `Failed to create session: ${fallbackError?.message || sessionError?.message || 'No session returned'}`,
                );
            }

            return {
                access_token: fallbackData.session.access_token,
                refresh_token: fallbackData.session.refresh_token,
                user: fallbackData.user,
            };
        }

        return {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
            user: sessionData.user,
        };
    }

    // ─── Token Refresh ───────────────────────────────────────────────
    async refreshToken(refreshToken: string) {
        const { data, error } = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        return {
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
        };
    }

    // ─── Get User ────────────────────────────────────────────────────
    async getUser(accessToken: string) {
        const { data, error } = await this.supabase.auth.getUser(accessToken);
        if (error) {
            throw new UnauthorizedException(error.message);
        }
        return data.user;
    }

    // ─── Logout ──────────────────────────────────────────────────────
    async logout(accessToken: string) {
        const { error } = await this.supabase.auth.admin.signOut(accessToken);
        if (error) {
            return { message: 'Logged out successfully' };
        }
        return { message: 'Logged out successfully' };
    }

    // ─── Helpers ─────────────────────────────────────────────────────
    private generateOtp(): string {
        return randomInt(100000, 999999).toString();
    }
}
