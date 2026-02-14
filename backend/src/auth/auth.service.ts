import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { GoogleLoginDto, RegisterDto, LoginDto, VerifyOtpDto } from './dto';
import { User } from './user.entity';
import { Profile } from '../profiles/profile.entity';
import { RefreshToken } from './refresh-token.entity';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateSecret, verifyTOTP, generateOtpAuthURI } from './totp.util';
import * as QRCode from 'qrcode';
import { UAParser } from 'ua-parser-js';

// ─── Constants ───────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REMEMBER_ME_REFRESH_TOKEN_EXPIRY_DAYS = 30;
const TEMP_2FA_TOKEN_EXPIRY = '5m';
const BACKUP_CODES_COUNT = 10;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private googleClient: OAuth2Client;

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private dataSource: DataSource,
        @Inject('SUPABASE_CLIENT')
        private supabase: SupabaseClient,
    ) {
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('GOOGLE_CLIENT_ID_WEB'),
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Google Login ─────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async googleLogin(googleLoginDto: GoogleLoginDto, ip?: string, userAgent?: string) {
        const { token } = googleLoginDto;

        let ticket;
        try {
            ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: [
                    this.configService.get<string>('GOOGLE_CLIENT_ID_WEB'),
                    this.configService.get<string>('GOOGLE_CLIENT_ID_IOS'),
                    this.configService.get<string>('GOOGLE_CLIENT_ID_ANDROID'),
                ].filter(Boolean) as string[],
            });
        } catch (error) {
            this.logger.warn(`Google token verification failed from IP ${ip}`);
            throw new UnauthorizedException('Invalid Google token');
        }

        const payload = ticket.getPayload();
        if (!payload) {
            throw new UnauthorizedException('Invalid Google token payload');
        }

        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            throw new BadRequestException('Email not found in Google token');
        }

        let user = await this.userRepository.findOne({ where: { email } });

        if (user) {
            // Check if account is locked
            this.checkAccountLock(user);

            if (!user.googleId) {
                user.googleId = googleId;
                user.avatarUrl = picture || user.avatarUrl;
                user.isEmailVerified = true;
                await this.userRepository.save(user);
            }
        } else {
            // Transactional creation
            await this.dataSource.transaction(async (manager) => {
                const newUser = manager.create(User, {
                    email,
                    googleId,
                    avatarUrl: picture,
                    isEmailVerified: true,
                    roles: ['worker'],
                });
                user = await manager.save(newUser);

                const profile = manager.create(Profile, {
                    id: user.id,
                    fullName: name || email.split('@')[0],
                    languagePreference: 'en',
                });
                await manager.save(profile);
            });
        }

        if (!user) {
            throw new BadRequestException('Failed to create or retrieve user');
        }

        // Reset failed attempts on successful login
        await this.resetFailedAttempts(user);
        await this.updateLastLogin(user);

        // Check 2FA
        if (user.is2faEnabled) {
            const tempToken = this.generate2FATempToken(user);
            return {
                message: '2FA required',
                requires2fa: true,
                temp_token: tempToken,
            };
        }

        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id, undefined, ip, userAgent);

        // Exchange Google ID Token for Supabase Session to support SyncService
        let supabaseAccessToken: string | undefined;
        let supabaseRefreshToken: string | undefined;
        try {
            const { data: supabaseData, error: supabaseError } = await this.supabase.auth.signInWithIdToken({
                provider: 'google',
                token: token,
            });
            if (!supabaseError && supabaseData.session) {
                supabaseAccessToken = supabaseData.session.access_token;
                supabaseRefreshToken = supabaseData.session.refresh_token;
            }
        } catch (e) {
            this.logger.warn('Supabase Google Sign-In failed, continuing without Supabase session');
        }

        return {
            user: this.sanitizeUser(user),
            access_token: accessToken,
            refresh_token: refreshToken,
            supabase_access_token: supabaseAccessToken,
            supabase_refresh_token: supabaseRefreshToken,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Email & Password Registration ────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async register(registerDto: RegisterDto, ip?: string, userAgent?: string) {
        const { email, password, fullName, phoneNumber } = registerDto;

        // Check if user already exists locally
        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new BadRequestException('An account with this email already exists');
        }

        // 1. Create user in Supabase Auth
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone_number: phoneNumber,
                },
            },
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        if (!data.user) {
            throw new BadRequestException('Registration failed');
        }

        const supabaseUser = data.user;

        // 2. Create user in local DB
        let user: User | null = null;
        await this.dataSource.transaction(async (manager) => {
            user = manager.create(User, {
                id: supabaseUser.id,
                email,
                phoneNumber,
                roles: ['worker'],
            });
            await manager.save(user);

            const profile = new Profile();
            profile.id = user!.id;
            profile.fullName = fullName;
            profile.languagePreference = 'en';
            await manager.save(Profile, profile);
        });

        this.logger.log(`New user registered: ${email} from IP ${ip}`);

        return {
            message: 'Registration successful. Please check your email for verification link.',
            user: {
                id: supabaseUser.id,
                email: email,
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Email & Password Login ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
        const { emailOrPhone, password, rememberMe } = loginDto;

        // Find user locally first to check lockout
        let user = await this.userRepository.findOne({
            where: [
                { email: emailOrPhone },
                { phoneNumber: emailOrPhone },
            ],
        });

        if (user) {
            this.checkAccountLock(user);
        }

        // 1. Login with Supabase
        const isEmail = emailOrPhone.includes('@');
        const signInPayload = isEmail
            ? { email: emailOrPhone, password }
            : { phone: emailOrPhone, password };

        const { data, error } = await this.supabase.auth.signInWithPassword(signInPayload);

        if (error) {
            // Increment failed attempts
            if (user) {
                await this.incrementFailedAttempts(user);
            }
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!data.user) {
            throw new UnauthorizedException('Login failed');
        }

        // 2. Sync/Get user from local DB
        if (!user) {
            user = await this.userRepository.findOne({ where: { id: data.user.id } });
        }

        if (!user) {
            throw new UnauthorizedException('User not found in system');
        }

        // Reset failed attempts on successful login
        await this.resetFailedAttempts(user);
        await this.updateLastLogin(user);

        // Mark email as verified if Supabase confirms it
        if (data.user.email_confirmed_at && !user.isEmailVerified) {
            user.isEmailVerified = true;
            user.emailConfirmedAt = new Date(data.user.email_confirmed_at);
            await this.userRepository.save(user);
        }

        if (user.is2faEnabled) {
            const tempToken = this.generate2FATempToken(user);
            return {
                message: '2FA required',
                requires2fa: true,
                temp_token: tempToken,
            };
        }

        // 3. Generate tokens
        const refreshExpiryDays = rememberMe ? REMEMBER_ME_REFRESH_TOKEN_EXPIRY_DAYS : REFRESH_TOKEN_EXPIRY_DAYS;
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id, undefined, ip, userAgent, refreshExpiryDays);

        return {
            user: this.sanitizeUser(user),
            access_token: accessToken,
            refresh_token: refreshToken,
            refresh_token_expiry_days: refreshExpiryDays,
            requires2fa: false,
            supabase_access_token: data.session?.access_token,
            supabase_refresh_token: data.session?.refresh_token,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Token Refresh ────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async refreshToken(oldRefreshToken: string, ip?: string, userAgent?: string) {
        const tokenHash = await this.hashToken(oldRefreshToken);
        const tokenEntity = await this.refreshTokenRepository.findOne({
            where: { tokenHash },
            relations: ['user'],
        });

        if (!tokenEntity) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Detect reuse of revoked token — security breach
        if (tokenEntity.isRevoked) {
            this.logger.warn(`Refresh token reuse detected for user ${tokenEntity.userId}. Revoking all sessions.`);
            await this.refreshTokenRepository.update({ userId: tokenEntity.userId }, { isRevoked: true });
            throw new UnauthorizedException('Token reuse detected. All sessions have been revoked for security.');
        }

        if (tokenEntity.expiresAt < new Date()) {
            tokenEntity.isRevoked = true;
            await this.refreshTokenRepository.save(tokenEntity);
            throw new UnauthorizedException('Refresh token expired');
        }

        // Revoke the used token (rotation)
        tokenEntity.isRevoked = true;
        await this.refreshTokenRepository.save(tokenEntity);

        // Generate new tokens
        const accessToken = this.generateAccessToken(tokenEntity.user);
        const newRefreshToken = await this.generateRefreshToken(tokenEntity.user.id, tokenEntity.tokenHash, ip, userAgent);

        return {
            access_token: accessToken,
            refresh_token: newRefreshToken,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Get User ─────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async getUser(id: string) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return this.sanitizeUser(user);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Logout ───────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async logout(refreshToken: string) {
        if (!refreshToken) return { message: 'Logged out successfully' };
        const tokenHash = await this.hashToken(refreshToken);
        const tokenEntity = await this.refreshTokenRepository.findOne({ where: { tokenHash } });
        if (tokenEntity) {
            tokenEntity.isRevoked = true;
            await this.refreshTokenRepository.save(tokenEntity);
        }
        return { message: 'Logged out successfully' };
    }

    async logoutAllDevices(userId: string) {
        await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
        return { message: 'All sessions have been revoked' };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Phone Auth ───────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async sendOtp(phoneNumber: string) {
        const { error } = await this.supabase.auth.signInWithOtp({
            phone: phoneNumber,
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        return {
            message: 'OTP sent successfully',
            phoneNumber,
        };
    }

    async verifyOtp(verifyOtpDto: VerifyOtpDto, ip?: string, userAgent?: string) {
        const { phoneNumber, otp } = verifyOtpDto;

        const { data, error } = await this.supabase.auth.verifyOtp({
            phone: phoneNumber,
            token: otp,
            type: 'sms',
        });

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        if (!data.user) {
            throw new UnauthorizedException('OTP verification failed');
        }

        // Check if user exists in local DB, if not create (auto-registration for phone)
        let user = await this.userRepository.findOne({ where: { phoneNumber } });

        if (!user) {
            await this.dataSource.transaction(async (manager) => {
                const newUser = manager.create(User, {
                    id: data.user!.id,
                    phoneNumber,
                    email: data.user!.email || `${phoneNumber.replace(/\+/g, '')}@phone.upcheck.app`,
                    roles: ['worker'],
                    isPhoneVerified: true,
                });
                user = await manager.save(newUser);

                const profile = new Profile();
                profile.id = newUser.id;
                profile.fullName = `User ${phoneNumber.slice(-4)}`;
                profile.languagePreference = 'en';
                await manager.save(Profile, profile);
            });
        } else {
            if (!user.isPhoneVerified) {
                user.isPhoneVerified = true;
                await this.userRepository.save(user);
            }
        }

        if (!user) {
            throw new UnauthorizedException('User creation failed');
        }

        await this.updateLastLogin(user);

        // Check 2FA
        if (user.is2faEnabled) {
            const tempToken = this.generate2FATempToken(user);
            return {
                message: '2FA required',
                requires2fa: true,
                temp_token: tempToken,
            };
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id, undefined, ip, userAgent);

        return {
            user: this.sanitizeUser(user),
            access_token: accessToken,
            refresh_token: refreshToken,
            requires2fa: false,
            supabase_access_token: data.session?.access_token,
            supabase_refresh_token: data.session?.refresh_token,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Email Verification ───────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async resendVerificationEmail(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            // Don't reveal whether user exists
            return { message: 'If the email is registered, a verification link has been sent.' };
        }

        if (user.isEmailVerified) {
            return { message: 'Email is already verified.' };
        }

        const { error } = await this.supabase.auth.resend({
            type: 'signup',
            email,
        });

        if (error) {
            this.logger.warn(`Failed to resend verification email for ${email}: ${error.message}`);
            throw new BadRequestException('Failed to send verification email');
        }

        return { message: 'Verification email sent successfully.' };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Password Management ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async forgotPassword(email: string) {
        // Always return generic message to prevent email enumeration
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            return { message: 'If the email exists, a password reset link has been sent.' };
        }

        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: this.configService.get('FRONTEND_URL') + '/reset-password',
        });

        if (error) {
            this.logger.warn(`Password reset request failed for ${email}: ${error.message}`);
            throw new BadRequestException(error.message);
        }

        return { message: 'If the email exists, a password reset link has been sent.' };
    }

    async resetPassword(token: string, refreshToken: string, newPassword: string) {
        const { data: userData, error: userError } = await this.supabase.auth.getUser(token);

        if (userError || !userData.user) {
            throw new UnauthorizedException('Invalid or expired reset token');
        }

        const { error } = await this.supabase.auth.admin.updateUserById(
            userData.user.id,
            { password: newPassword }
        );

        if (error) {
            throw new BadRequestException(error.message);
        }

        // Revoke all refresh tokens for this user
        await this.refreshTokenRepository.update({ userId: userData.user.id }, { isRevoked: true });

        this.logger.log(`Password reset completed for user ${userData.user.id}`);

        return { message: 'Password updated successfully. Please login with your new password.' };
    }

    async changePassword(userId: string, oldPass: string, newPass: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Verify old password by signing in
        const { error } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: oldPass,
        });

        if (error) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Update password using admin api
        const { error: updateError } = await this.supabase.auth.admin.updateUserById(
            userId,
            { password: newPass }
        );

        if (updateError) {
            throw new BadRequestException(updateError.message);
        }

        // Revoke all tokens except current session would be ideal,
        // but for security, revoke all and force re-login
        await this.refreshTokenRepository.update({ userId }, { isRevoked: true });

        this.logger.log(`Password changed for user ${userId}`);

        return { message: 'Password changed successfully. Please login again.' };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Session Management ───────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async getSessions(userId: string) {
        const sessions = await this.refreshTokenRepository.find({
            where: { userId, isRevoked: false, expiresAt: MoreThan(new Date()) },
            order: { lastActiveAt: 'DESC' },
            select: ['id', 'deviceType', 'deviceOs', 'browser', 'ipAddress', 'createdAt', 'lastActiveAt', 'location'],
        });
        return sessions;
    }

    async revokeSession(userId: string, sessionId: string) {
        const token = await this.refreshTokenRepository.findOne({ where: { id: sessionId, userId } });
        if (!token) {
            throw new UnauthorizedException('Session not found');
        }
        token.isRevoked = true;
        await this.refreshTokenRepository.save(token);
        return { message: 'Session revoked' };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── 2FA (TOTP) ──────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async setup2FA(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.is2faEnabled) {
            throw new BadRequestException('2FA is already enabled. Disable it first to reconfigure.');
        }

        const secret = generateSecret();
        const otpauthUrl = generateOtpAuthURI({ issuer: 'Upcheck', label: user.email, secret });

        // Store secret (in production, encrypt this)
        user.totpSecret = secret;
        await this.userRepository.save(user);

        const qrCode = await QRCode.toDataURL(otpauthUrl);

        return {
            secret,
            otpAuthUrl: otpauthUrl,
            qrCode,
        };
    }

    async enable2FA(userId: string, token: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.totpSecret) {
            throw new UnauthorizedException('2FA not set up. Please call setup first.');
        }

        const isValid = verifyTOTP(token, user.totpSecret);

        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA code. Please try again.');
        }

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        const hashedCodes = await Promise.all(
            backupCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
        );

        user.is2faEnabled = true;
        user.backupCodes = hashedCodes;
        await this.userRepository.save(user);

        return {
            message: '2FA enabled successfully',
            backupCodes, // Return plain codes ONCE for user to save
        };
    }

    async disable2FA(userId: string, token: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.is2faEnabled) {
            throw new BadRequestException('2FA is not enabled');
        }

        // Verify TOTP code before disabling
        const isValid = verifyTOTP(token, user.totpSecret);

        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA code');
        }

        user.is2faEnabled = false;
        user.totpSecret = null as any;
        user.backupCodes = null as any;
        await this.userRepository.save(user);

        this.logger.log(`2FA disabled for user ${userId}`);

        return { message: '2FA has been disabled' };
    }

    async regenerateBackupCodes(userId: string, token: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.is2faEnabled) {
            throw new UnauthorizedException('2FA is not enabled');
        }

        // Verify TOTP before regenerating
        const isValid = verifyTOTP(token, user.totpSecret);

        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA code');
        }

        const backupCodes = this.generateBackupCodes();
        const hashedCodes = await Promise.all(
            backupCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
        );

        user.backupCodes = hashedCodes;
        await this.userRepository.save(user);

        return {
            message: 'Backup codes regenerated. Previous codes are now invalid.',
            backupCodes,
        };
    }

    async loginWith2FA(tempToken: string, token: string, ip?: string, userAgent?: string) {
        let payload: any;
        try {
            payload = this.jwtService.verify(tempToken);
        } catch (e) {
            throw new UnauthorizedException('Invalid or expired temporary token. Please login again.');
        }

        if (!payload.is2faStage) {
            throw new UnauthorizedException('Invalid token usage');
        }

        const userId = payload.sub;
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.is2faEnabled) {
            throw new UnauthorizedException('2FA not enabled for this user');
        }

        // Try TOTP first
        let isValid = verifyTOTP(token, user.totpSecret);

        // If TOTP fails, try backup codes
        if (!isValid) {
            isValid = await this.verifyBackupCode(user, token);
        }

        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA code');
        }

        await this.updateLastLogin(user);

        // Generate full tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id, undefined, ip, userAgent);

        return {
            user: this.sanitizeUser(user),
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Account Management ───────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async deleteAccount(userId: string, password?: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // If user has a password (email auth), verify it
        if (password) {
            const { error } = await this.supabase.auth.signInWithPassword({
                email: user.email,
                password,
            });
            if (error) {
                throw new UnauthorizedException('Invalid password');
            }
        }

        // Revoke all tokens
        await this.refreshTokenRepository.update({ userId }, { isRevoked: true });

        // Delete from Supabase
        try {
            await this.supabase.auth.admin.deleteUser(userId);
        } catch (e) {
            this.logger.warn(`Failed to delete user ${userId} from Supabase: ${e}`);
        }

        // Delete profile and user (cascade should handle refresh tokens)
        await this.profileRepository.delete({ id: userId });
        await this.userRepository.delete({ id: userId });

        this.logger.log(`Account deleted for user ${userId}`);

        return { message: 'Account has been permanently deleted' };
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Private Helpers ──────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    private generateAccessToken(user: User): string {
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            is2faEnabled: user.is2faEnabled,
        };
        return this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
    }

    private generate2FATempToken(user: User): string {
        const tempPayload = { sub: user.id, is2faStage: true, email: user.email };
        return this.jwtService.sign(tempPayload, { expiresIn: TEMP_2FA_TOKEN_EXPIRY });
    }

    private async generateRefreshToken(
        userId: string,
        parentToken?: string,
        ip?: string,
        userAgent?: string,
        expiryDays: number = REFRESH_TOKEN_EXPIRY_DAYS,
    ): Promise<string> {
        const token = randomBytes(32).toString('hex');
        const tokenHash = await this.hashToken(token);

        let deviceType = 'unknown';
        let deviceOs = 'unknown';
        let browser = 'unknown';

        if (userAgent) {
            const parser = new UAParser(userAgent);
            const result = parser.getResult();
            deviceType = result.device.type || 'desktop';
            deviceOs = result.os.name || 'unknown';
            browser = result.browser.name || 'unknown';
        }

        const refreshToken = this.refreshTokenRepository.create({
            userId,
            tokenHash,
            expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            parentToken,
            ipAddress: ip,
            deviceType,
            deviceOs,
            browser,
        });

        await this.refreshTokenRepository.save(refreshToken);
        return token;
    }

    private async hashToken(token: string): Promise<string> {
        return createHash('sha256').update(token).digest('hex');
    }

    private checkAccountLock(user: User): void {
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new ForbiddenException(
                `Account is temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`
            );
        }
    }

    private async incrementFailedAttempts(user: User): Promise<void> {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
            user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
            this.logger.warn(`Account locked for user ${user.email} after ${MAX_FAILED_ATTEMPTS} failed attempts`);
        }

        await this.userRepository.save(user);
    }

    private async resetFailedAttempts(user: User): Promise<void> {
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            user.failedLoginAttempts = 0;
            user.lockedUntil = null as any;
            await this.userRepository.save(user);
        }
    }

    private async updateLastLogin(user: User): Promise<void> {
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);
    }

    private generateBackupCodes(): string[] {
        const codes: string[] = [];
        for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
            // Generate 8-character alphanumeric codes in xxxx-xxxx format
            const raw = randomBytes(4).toString('hex').toUpperCase();
            codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
        }
        return codes;
    }

    private async verifyBackupCode(user: User, code: string): Promise<boolean> {
        if (!user.backupCodes || user.backupCodes.length === 0) {
            return false;
        }

        for (let i = 0; i < user.backupCodes.length; i++) {
            const isMatch = await bcrypt.compare(code, user.backupCodes[i]);
            if (isMatch) {
                // Remove used backup code
                user.backupCodes.splice(i, 1);
                await this.userRepository.save(user);
                this.logger.log(`Backup code used for user ${user.id}. ${user.backupCodes.length} codes remaining.`);
                return true;
            }
        }
        return false;
    }

    private sanitizeUser(user: User): Partial<User> {
        const { passwordHash, totpSecret, backupCodes, ...sanitized } = user;
        return sanitized;
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── Cleanup (called by scheduler) ────────────────────────────
    // ═══════════════════════════════════════════════════════════════
    async cleanupExpiredTokens(): Promise<number> {
        const result = await this.refreshTokenRepository
            .createQueryBuilder()
            .delete()
            .where('expires_at < :now', { now: new Date() })
            .orWhere('is_revoked = :revoked', { revoked: true })
            .execute();

        const count = result.affected || 0;
        if (count > 0) {
            this.logger.log(`Cleaned up ${count} expired/revoked refresh tokens`);
        }
        return count;
    }
}
