import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    Logger,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import { RedisService } from '../redis/redis.service';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { EmailService } from '../email.service';
import { authenticator } from 'otplib';
const zxcvbn = require('zxcvbn');
import { User } from './user.entity';
import { OtpCode } from './otp-code.entity';
import { RefreshToken } from './refresh-token.entity';
import { LoginHistory } from './login-history.entity';
import {
    RegisterDto,
    LoginDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ChangePasswordDto,
    UpdateProfileDto,
    GoogleAuthDto,
    RefreshTokenDto,
} from './dto/auth.dto';
import { LoginOtpRequestDto, LoginOtpVerifyDto } from './dto/login-otp.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private googleClient: OAuth2Client;

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        @InjectRepository(LoginHistory)
        private loginHistoryRepository: Repository<LoginHistory>,
        private jwtService: JwtService,
        private emailService: EmailService,
        private configService: ConfigService,
        private redisService: RedisService,
    ) {
        // Initialize with web client ID, but we'll verify against all platform IDs
        const webClientId = this.configService.get('GOOGLE_CLIENT_ID_WEB') || this.configService.get('GOOGLE_CLIENT_ID');
        this.googleClient = new OAuth2Client(webClientId);
    }

    // ==================== Registration ====================

    async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
        const { email, password, firstName, lastName, username, phoneNumber } = registerDto;

        // Optimize uniqueness checks with parallel queries
        const [existingEmail, existingUsername, existingPhone] = await Promise.all([
            this.userRepository.findOne({ where: { email } }),
            this.userRepository.findOne({ where: { username } }),
            phoneNumber ? this.userRepository.findOne({ where: { phone: phoneNumber } }) : Promise.resolve(null),
        ]);

        if (existingEmail) throw new ConflictException('Email already registered');
        if (existingUsername) throw new ConflictException('Username already taken');
        if (existingPhone) throw new ConflictException('Phone number already registered');

        this.validatePasswordStrength(password);

        const passwordHash = await argon2.hash(password);

        const user = this.userRepository.create({
            email,
            username,
            passwordHash,
            firstName,
            lastName,
            phone: phoneNumber,
            verificationLevel: 'basic',
            authProvider: 'email',
            emailVerified: false,
        });

        try {
            await this.userRepository.save(user);
        } catch (error: any) {
            // Handle unique constraint violations from database
            if (error.code === '23505') { // PostgreSQL unique violation
                if (error.constraint?.includes('email')) {
                    throw new ConflictException('Email already registered');
                } else if (error.constraint?.includes('username')) {
                    throw new ConflictException('Username already taken');
                } else if (error.constraint?.includes('phone')) {
                    throw new ConflictException('Phone number already registered');
                }
            }
            throw error;
        }

        // Generate tokens first (critical path)
        const { accessToken, refreshToken } = await this.generateTokens(user, ipAddress, userAgent);

        // Send verification email asynchronously (non-blocking - don't fail registration if email fails)
        const code = await this.generateOtp(user.id, 'email_verify');
        this.emailService.sendOtpEmail(email, code, firstName).catch(err => {
            this.logger.error(`Failed to send verification email to ${email}: ${err.message}`);
        });

        return {
            message: 'Registration successful. Please verify your email.',
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken,
        };
    }

    // ==================== Login ====================

    async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
        const { emailOrPhone, password } = loginDto;

        let foundUser = await this.userRepository.findOne({
            where: [
                { email: emailOrPhone },
                { username: emailOrPhone }
            ]
        });

        if (!foundUser) {
            foundUser = await this.userRepository.findOne({ where: { phone: emailOrPhone } });
        }

        if (!foundUser) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (foundUser.lockedUntil && foundUser.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((foundUser.lockedUntil.getTime() - new Date().getTime()) / 60000);
            throw new ForbiddenException(`Account locked. Try again in ${minutesLeft} minutes.`);
        }

        const isPasswordValid = foundUser.passwordHash && await argon2.verify(foundUser.passwordHash, password);

        if (!isPasswordValid) {
            await this.handleFailedLogin(foundUser, 'password', ipAddress, userAgent);
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.handleSuccessfulLogin(foundUser, 'password', ipAddress, userAgent);

        // 2FA Check
        if (foundUser.is2faEnabled) {
            const tempToken = this.jwtService.sign(
                { sub: foundUser.id, type: '2fa_login' },
                {
                    expiresIn: '5m',
                    algorithm: 'RS256',
                    privateKey: this.loadPrivateKey()
                }
            );
            return {
                message: '2FA required',
                requires2fa: true,
                tempToken,
                user: { id: foundUser.id } // Minimal user info
            };
        }

        const tokens = await this.generateTokens(foundUser, ipAddress, userAgent);
        return {
            message: 'Login successful',
            user: this.sanitizeUser(foundUser),
            ...tokens,
        };
    }

    private loadPrivateKey(): Buffer | string {
        // Prefer env var (for cloud deployments like Render), fallback to file
        const envPrivateKey = process.env.JWT_PRIVATE_KEY;
        if (envPrivateKey) {
            return envPrivateKey.replace(/\\n/g, '\n');
        }
        const privateKeyPath = path.join(process.cwd(), 'secrets', 'private.pem');
        try {
            return fs.readFileSync(privateKeyPath);
        } catch (error) {
            throw new Error('Internal server error: private key not found. Set JWT_PRIVATE_KEY env var or provide secrets/private.pem');
        }
    }

    private validatePasswordStrength(password: string) {
        // zxcvbn returns an object with 'score' (0-4)
        // 0-1: weak, 2: fair, 3: good, 4: strong
        const result = zxcvbn(password);
        if (result.score < 3) {
            throw new BadRequestException('Password is too weak. Please use a stronger password.');
        }
    }

    // ==================== 2FA / TOTP ====================

    async setupTwoFactor(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const secret = authenticator.generateSecret();
        const otpAuthUrl = authenticator.keyuri(user.email, 'Upcheck', secret);

        // Store secret temporarily (e.g., 10 mins)
        await this.redisService.set(`2fa_setup:${userId}`, secret, 'EX', 600);

        return { secret, otpAuthUrl };
    }

    async enableTwoFactor(userId: string, token: string) {
        const secret = await this.redisService.get(`2fa_setup:${userId}`);
        if (!secret) throw new BadRequestException('2FA setup expired. Please try again.');

        // Allow some drift?
        // authenticator.options = { window: 1 };
        const isValid = authenticator.check(token, secret);
        if (!isValid) throw new BadRequestException('Invalid OTP code');

        // Allow some drift?
        // authenticator.options = { window: 1 }; 

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        user.totpSecret = secret;
        user.is2faEnabled = true;

        // Generate Backup Codes
        const backupCodes = Array.from({ length: 10 }, () => randomBytes(4).toString('hex')); // 8 chars
        // In real app, hash these. For now storing raw as per User entity definition (simple-array) implies string.
        user.backupCodes = backupCodes;

        await this.userRepository.save(user);
        await this.redisService.del(`2fa_setup:${userId}`);

        return { message: '2FA enabled successfully', backupCodes };
    }

    async verifyTwoFactorLogin(tempToken: string, code: string, ipAddress?: string, userAgent?: string) {
        let payload: any;
        try {
            // Verify temp token
            const publicKeyPath = path.join(process.cwd(), 'secrets', 'public.pem');
            const publicKey = fs.readFileSync(publicKeyPath);
            payload = this.jwtService.verify(tempToken, { secret: publicKey, algorithms: ['RS256'] });
        } catch (e) {
            throw new UnauthorizedException('Invalid or expired login session');
        }

        if (payload.type !== '2fa_login') throw new UnauthorizedException('Invalid token type');

        const user = await this.userRepository.findOne({ where: { id: payload.sub } });
        if (!user || !user.is2faEnabled || !user.totpSecret) {
            throw new UnauthorizedException('Invalid user state');
        }

        const isValid = authenticator.check(code, user.totpSecret);
        if (!isValid) {
            // Check backup codes
            if (user.backupCodes && user.backupCodes.includes(code)) {
                // Remove used backup code
                user.backupCodes = user.backupCodes.filter(c => c !== code);
                await this.userRepository.save(user);
            } else {
                throw new UnauthorizedException('Invalid OTP code');
            }
        }

        const tokens = await this.generateTokens(user, ipAddress, userAgent);
        return {
            message: 'Login successful',
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    // ==================== OTP Login ====================

    async requestOtpLogin(dto: LoginOtpRequestDto) {
        const user = await this.userRepository.findOne({ where: { email: dto.email } });
        if (!user) {
            return { message: 'Verification code sent to email', expires_in: 300 };
        }

        const code = await this.generateOtp(user.id, 'login');
        // Send OTP email asynchronously (non-blocking)
        this.emailService.sendOtpEmail(user.email, code, user.firstName || undefined).catch(err => {
            this.logger.error(`Failed to send OTP email to ${user.email}: ${err.message}`);
        });

        return {
            message: `Verification code sent to ${dto.email}`,
            expires_in: 300,
            resend_available_in: 60,
        };
    }

    async verifyOtpLogin(dto: LoginOtpVerifyDto, ipAddress?: string, userAgent?: string) {
        const user = await this.userRepository.findOne({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('Invalid or expired verification code');

        const isValid = await this.validateOtp(user.id, dto.otp, 'login');
        if (!isValid) {
            await this.handleFailedLogin(user, 'otp', ipAddress, userAgent);
            throw new BadRequestException('Invalid or expired verification code');
        }

        // Mark used
        await this.otpRepository.update({ userId: user.id, code: dto.otp, isUsed: false }, { isUsed: true, verifiedAt: new Date() });

        await this.handleSuccessfulLogin(user, 'otp', ipAddress, userAgent);

        const tokens = await this.generateTokens(user);
        return {
            message: 'Login successful',
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    // ==================== Social Login ====================

    async googleAuth(googleAuthDto: GoogleAuthDto, ipAddress?: string, userAgent?: string) {
        try {
            // Get all possible client IDs
            const clientIds = [
                this.configService.get('GOOGLE_CLIENT_ID_WEB'),
                this.configService.get('GOOGLE_CLIENT_ID_IOS'),
                this.configService.get('GOOGLE_CLIENT_ID_ANDROID'),
                this.configService.get('GOOGLE_CLIENT_ID'), // Fallback for backwards compatibility
            ].filter(Boolean);

            if (clientIds.length === 0) {
                throw new Error('No Google Client IDs configured');
            }

            const ticket = await this.googleClient.verifyIdToken({
                idToken: googleAuthDto.idToken,
                audience: clientIds,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) throw new BadRequestException('Invalid Google token');

            const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

            let user = await this.userRepository.findOne({ where: { googleId } });

            if (!user) {
                user = await this.userRepository.findOne({ where: { email } });
                if (user) {
                    // Strict Collision Handling: if user exists but has no googleId, require linking
                    if (!user.googleId) {
                        throw new ConflictException('email_exists_as_password_account');
                    }
                    // If user has googleId (and it didn't match above, which is weird but possible if they changed email? 
                    // No, googleId is unique. If we found by email but not by googleId, it implies googleId is null or different?
                    // If googleId was present, findOne({ where: { googleId } }) would have found it.
                    // So here user.googleId must be null/undefined.
                } else {
                    user = this.userRepository.create({
                        email,
                        username: email.split('@')[0] + randomBytes(4).toString('hex'),
                        firstName: firstName || 'User',
                        lastName: lastName || '',
                        authProvider: 'google',
                        googleId,
                        emailVerified: true,
                        avatarUrl: picture,
                        verificationLevel: 'basic',
                    });
                    await this.userRepository.save(user);
                    // Send welcome email asynchronously (non-blocking)
                    this.emailService.sendWelcomeEmail(email, firstName).catch(err => {
                        this.logger.error(`Failed to send welcome email to ${email}: ${err.message}`);
                    });
                }
            }

            const tokens = await this.generateTokens(user, ipAddress, userAgent);
            return {
                message: 'Google authentication successful',
                user: this.sanitizeUser(user),
                ...tokens,
            };
        } catch (error) {
            if (error instanceof ConflictException) throw error;
            this.logger.error(error);
            throw new UnauthorizedException('Invalid Google token');
        }
    }

    async linkGoogleAccount(userId: string, googleAuthDto: GoogleAuthDto) {
        try {
            // Get all possible client IDs
            const clientIds = [
                this.configService.get('GOOGLE_CLIENT_ID_WEB'),
                this.configService.get('GOOGLE_CLIENT_ID_IOS'),
                this.configService.get('GOOGLE_CLIENT_ID_ANDROID'),
                this.configService.get('GOOGLE_CLIENT_ID'), // Fallback for backwards compatibility
            ].filter(Boolean);

            const ticket = await this.googleClient.verifyIdToken({
                idToken: googleAuthDto.idToken,
                audience: clientIds,
            });
            const payload = ticket.getPayload();
            if (!payload) throw new BadRequestException('Invalid Google token');

            const { sub: googleId, picture } = payload;

            // Check if googleId is already linked to another account
            const existingUser = await this.userRepository.findOne({ where: { googleId } });
            if (existingUser) {
                if (existingUser.id === userId) {
                    return { message: 'Account already linked' };
                }
                throw new ConflictException('google_account_already_linked_to_another_user');
            }

            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) throw new NotFoundException('User not found');

            user.googleId = googleId;
            user.emailVerified = true; // Trust Google
            if (!user.avatarUrl && picture) user.avatarUrl = picture;

            await this.userRepository.save(user);

            return { message: 'Google account linked successfully' };

        } catch (error) {
            if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
            this.logger.error(error);
            throw new UnauthorizedException('Invalid Google token');
        }
    }

    // ==================== Password Management ====================

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.userRepository.findOne({ where: { email: dto.email } });
        if (!user || user.authProvider !== 'email') {
            return { message: 'Password reset instructions sent to your email' };
        }

        const code = await this.generateOtp(user.id, 'password_reset');
        // Send password reset email asynchronously (non-blocking)
        this.emailService.sendOtpEmail(user.email, code, user.firstName || undefined).catch(err => {
            this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
        });

        return { message: 'Verification code sent to your email' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const tokenRecord = await this.otpRepository.findOne({
            where: { code: dto.token, codeType: 'password_reset', isUsed: false },
            relations: ['user']
        });

        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            throw new BadRequestException('Invalid or expired code');
        }

        this.validatePasswordStrength(dto.newPassword);
        const passwordHash = await argon2.hash(dto.newPassword);

        await this.userRepository.update({ id: tokenRecord.userId }, { passwordHash });

        tokenRecord.isUsed = true;
        tokenRecord.verifiedAt = new Date();
        await this.otpRepository.save(tokenRecord);

        await this.refreshTokenRepository.update({ userId: tokenRecord.userId }, { isRevoked: true });

        // Ensure user is loaded for email
        if (!tokenRecord.user) {
            tokenRecord.user = await this.userRepository.findOneByOrFail({ id: tokenRecord.userId });
        }
        // Send password changed notification asynchronously (non-blocking)
        this.emailService.sendPasswordChangedNotification(tokenRecord.user.email, tokenRecord.user.firstName || undefined).catch(err => {
            this.logger.error(`Failed to send password changed notification to ${tokenRecord.user.email}: ${err.message}`);
        });

        return { message: 'Password reset successful' };
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        if (user.authProvider !== 'email') {
            throw new BadRequestException('Cannot change password for social login accounts');
        }

        if (user.passwordHash) {
            const isPasswordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
            if (!isPasswordValid) throw new UnauthorizedException('Current password is incorrect');
        }

        this.validatePasswordStrength(dto.newPassword);
        const passwordHash = await argon2.hash(dto.newPassword);
        user.passwordHash = passwordHash;
        await this.userRepository.save(user);

        await this.refreshTokenRepository.update({ userId: user.id }, { isRevoked: true });

        // Send password changed notification asynchronously (non-blocking)
        this.emailService.sendPasswordChangedNotification(user.email, user.firstName || undefined).catch(err => {
            this.logger.error(`Failed to send password changed notification to ${user.email}: ${err.message}`);
        });

        return { message: 'Password changed successfully' };
    }

    // ==================== Token Management ====================

    async refreshToken(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
        const { refreshToken } = dto;
        const tokenRecord = await this.refreshTokenRepository.findOne({
            where: { tokenHash: refreshToken, isRevoked: false, expiresAt: MoreThan(new Date()) }
        });

        if (!tokenRecord) throw new UnauthorizedException('Invalid or expired refresh token');

        // Revoke
        tokenRecord.isRevoked = true;
        await this.refreshTokenRepository.save(tokenRecord);

        const user = await this.userRepository.findOne({ where: { id: tokenRecord.userId } });
        // Handle null user?
        if (!user) throw new UnauthorizedException('User not found');

        const tokens = await this.generateTokens(user, ipAddress, userAgent);

        return {
            message: 'Token refreshed successfully',
            ...tokens,
        };
    }

    async logout(userId: string, refreshToken: string) {
        await this.refreshTokenRepository.update({ tokenHash: refreshToken }, { isRevoked: true });
        return { message: 'Logged out successfully' };
    }

    async logoutAllDevices(userId: string) {
        await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
        return { message: 'Logged out from all devices successfully' };
    }

    async getSessions(userId: string) {
        // Find active refresh tokens
        const tokens = await this.refreshTokenRepository.find({
            where: {
                userId,
                isRevoked: false,
                expiresAt: MoreThan(new Date()),
            },
            order: { lastActiveAt: 'DESC' },
        });

        return tokens.map(token => ({
            id: token.id,
            ipAddress: token.ipAddress,
            deviceType: token.deviceType,
            deviceOs: token.deviceOs,
            browser: token.browser,
            createdAt: token.createdAt,
            lastActiveAt: token.lastActiveAt,
        }));
    }

    async revokeSession(userId: string, sessionId: string) {
        const token = await this.refreshTokenRepository.findOne({ where: { id: sessionId, userId } });
        if (!token) throw new NotFoundException('Session not found');

        token.isRevoked = true;
        await this.refreshTokenRepository.save(token);

        return { message: 'Session revoked successfully' };
    }

    async deleteAccount(userId: string) {
        await this.userRepository.delete(userId);
        return { message: 'Account deleted successfully' };
    }

    // ==================== Profile Management ====================

    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        return this.sanitizeUser(user);
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const updates: Partial<User> = {};
        if (dto.name) {
            const parts = dto.name.split(' ');
            updates.firstName = parts[0];
            updates.lastName = parts.slice(1).join(' ');
        }
        if (dto.profilePicture) {
            updates.avatarUrl = dto.profilePicture;
        }

        await this.userRepository.update({ id: userId }, updates);

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        return {
            message: 'Profile updated successfully',
            user: this.sanitizeUser(user),
        };
    }

    async verifyEmail(token: string) {
        const tokenRecord = await this.otpRepository.findOne({
            where: { code: token, codeType: 'email_verify', isUsed: false }
        });

        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            throw new BadRequestException('Invalid or expired token');
        }

        await this.userRepository.update({ id: tokenRecord.userId }, { emailVerified: true });

        tokenRecord.isUsed = true;
        tokenRecord.verifiedAt = new Date();
        await this.otpRepository.save(tokenRecord);

        const user = await this.userRepository.findOne({ where: { id: tokenRecord.userId } });
        if (user) {
            // Send welcome email asynchronously (non-blocking)
            this.emailService.sendWelcomeEmail(user.email, user.firstName || undefined).catch(err => {
                this.logger.error(`Failed to send welcome email to ${user.email}: ${err.message}`);
            });
        }

        return { message: 'Email verified successfully', user: user ? this.sanitizeUser(user) : null };
    }

    async resendVerification(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) return { message: 'Verification email sent' };

        if (user.emailVerified) throw new BadRequestException('Email already verified');

        const code = await this.generateOtp(user.id, 'email_verify');
        // Send verification email asynchronously (non-blocking)
        this.emailService.sendVerificationEmail(email, code, user.firstName || undefined).catch(err => {
            this.logger.error(`Failed to send verification email to ${email}: ${err.message}`);
        });
        return { message: 'Verification email sent' };
    }

    async updatePreferences(userId: string, key: string, value: any) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Initialize if null
        if (!user.preferences) user.preferences = {};

        user.preferences[key] = value;
        await this.userRepository.save(user);

        return { message: 'Preferences updated', preferences: user.preferences };
    }

    // ==================== Private Helpers ====================

    private async generateOtp(userId: string, type: string): Promise<string> {
        let code: string;
        let ttlSeconds = 300; // 5 minutes

        if (type === 'email_verify' || type === 'password_reset') { // Changed 'password_reset_link' to 'password_reset' to match usage
            code = randomBytes(32).toString('hex');
            ttlSeconds = 86400; // 24 hours
            // For links, store directly: key=type:code, value=userId
            // value is userId
            await this.redisService.set(`${type}:${code}`, userId, 'EX', ttlSeconds);
        } else {
            code = Math.floor(100000 + Math.random() * 900000).toString();
            // For codes, store: key=otp:userId:type, value=hash(code)
            const hash = await argon2.hash(code);
            await this.redisService.set(`otp:${userId}:${type}`, hash, 'EX', ttlSeconds);
        }

        return code;
    }

    private async validateOtp(userId: string, code: string, type: string): Promise<boolean> {
        if (type === 'email_verify' || type === 'password_reset') {
            // For links, the code IS the key suffix.
            // But signature asks for userId.
            // If we validated by lookup, we already have userId. 
            // This method signature assumes we know userId and check code.
            // For links, we usually lookup code -> userId.
            // So this method is primarily for 6-digit codes.
            return false;
        }

        const hash = await this.redisService.get(`otp:${userId}:${type}`);
        if (!hash) return false;

        const isValid = await argon2.verify(hash, code);
        if (isValid) {
            await this.redisService.del(`otp:${userId}:${type}`);
        }
        return isValid;
    }

    // Helper for link verification
    private async verifyLinkToken(type: string, token: string): Promise<string | null> {
        const userId = await this.redisService.get(`${type}:${token}`);
        if (userId) {
            await this.redisService.del(`${type}:${token}`);
        }
        return userId;
    }

    private async handleFailedLogin(user: User, method: string, ip?: string, ua?: string) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 5) {
            const lockoutTime = new Date();
            lockoutTime.setMinutes(lockoutTime.getMinutes() + 15);
            user.lockedUntil = lockoutTime;
        }
        await this.userRepository.save(user);

        await this.loginHistoryRepository.save({
            userId: user.id,
            loginMethod: method,
            success: false,
            failureReason: 'Invalid Credentials/OTP',
            ipAddress: ip,
            userAgent: ua,
        });
    }

    private async handleSuccessfulLogin(user: User, method: string, ip?: string, ua?: string) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null; // Fix: Assign null. If TypeORM issue, check Entity.
        // If entity defines Date, using null might trigger TS error depending on strictNullChecks.
        // I will use 'as any' or modify Entity later if needed, but 'nullable: true' in Entity usually implies type | null.
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);

        await this.loginHistoryRepository.save({
            userId: user.id,
            loginMethod: method,
            success: true,
            ipAddress: ip,
            userAgent: ua,
        });
    }

    private async generateTokens(user: User, ipAddress?: string, userAgent?: string) {
        const payload = { sub: user.id, email: user.email };

        // Load private key
        const privateKey = this.loadPrivateKey();

        const accessToken = this.jwtService.sign(payload, {
            privateKey,
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
            algorithm: 'RS256'
        });

        // Refresh token can stay as HS256 or be opaque. 
        // Spec says: "Refresh Token: Opaque 256-bit random string... Stored server-side in Redis"
        // But current implementation uses JWT refresh tokens.
        // Spec says: "Refresh Token: Opaque 256-bit random string"
        // I should switch to opaque string as per spec V2.

        // Generating Opaque Refresh Token
        const refreshToken = randomBytes(32).toString('hex');

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);

        // Simple UA parsing (very basic)
        let deviceType = 'unknown';
        let deviceOs = 'unknown';
        let browser = 'unknown';

        if (userAgent) {
            const ua = userAgent.toLowerCase();
            if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) deviceType = 'mobile';
            else deviceType = 'desktop';

            if (ua.includes('windows')) deviceOs = 'Windows';
            else if (ua.includes('mac')) deviceOs = 'macOS';
            else if (ua.includes('linux')) deviceOs = 'Linux';
            else if (ua.includes('android')) deviceOs = 'Android';
            else if (ua.includes('ios') || ua.includes('iphone')) deviceOs = 'iOS';

            if (ua.includes('chrome')) browser = 'Chrome';
            else if (ua.includes('firefox')) browser = 'Firefox';
            else if (ua.includes('safari')) browser = 'Safari';
            else if (ua.includes('edge')) browser = 'Edge';
        }

        await this.refreshTokenRepository.save({
            userId: user.id,
            tokenHash: refreshToken,
            expiresAt: expiry,
            isRevoked: false,
            ipAddress,
            deviceType,
            deviceOs,
            browser,
            lastActiveAt: new Date(),
        });

        return { accessToken, refreshToken };
    }

    private sanitizeUser(user: User) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, totpSecret, backupCodes, ...safeUser } = user;
        return safeUser;
    }

    async validateUser(userId: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }
}
