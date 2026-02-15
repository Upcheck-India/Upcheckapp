import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { SupabaseService } from '../supabase.service';
import { EmailService } from '../email.service';
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

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private googleClient: OAuth2Client;

    constructor(
        private supabaseService: SupabaseService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private configService: ConfigService,
    ) {
        // Initialize Google OAuth client
        this.googleClient = new OAuth2Client(
            this.configService.get('GOOGLE_CLIENT_ID'),
        );
    }

    // ==================== Registration & Login ====================

    async register(registerDto: RegisterDto) {
        const { email, password, name } = registerDto;

        // Check if user already exists
        const existingUser = await this.supabaseService.findUserByEmail(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await this.supabaseService.createUser({
            email,
            passwordHash,
            name,
            authProvider: 'email',
            emailVerified: false,
        });

        // Generate verification token
        const verificationToken = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

        await this.supabaseService.saveVerificationToken(
            user.id,
            verificationToken,
            expiresAt,
            'email_verification',
        );

        // Send verification email
        await this.emailService.sendVerificationEmail(
            email,
            verificationToken,
            name,
        );

        // Generate tokens
        const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

        this.logger.log(`New user registered: ${email}`);

        return {
            message: 'Registration successful. Please check your email to verify your account.',
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // Find user
        const user = await this.supabaseService.findUserByEmail(email);
        if (!user || user.auth_provider !== 'email') {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

        this.logger.log(`User logged in: ${email}`);

        return {
            message: 'Login successful',
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken,
        };
    }

    // ==================== Google OAuth ====================

    async googleAuth(googleAuthDto: GoogleAuthDto) {
        const { idToken } = googleAuthDto;

        try {
            // Verify Google ID token
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.configService.get('GOOGLE_CLIENT_ID'),
            });

            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                throw new BadRequestException('Invalid Google token');
            }

            const { sub: googleId, email, name, picture } = payload;

            // Check if user exists by Google ID
            let user = await this.supabaseService.findUserByGoogleId(googleId);

            if (!user) {
                // Check if user exists by email (linking accounts)
                user = await this.supabaseService.findUserByEmail(email);

                if (user) {
                    // Link Google account to existing user
                    user = await this.supabaseService.updateUser(user.id, {
                        google_id: googleId,
                        email_verified: true,
                        profile_picture: picture || user.profile_picture,
                    });

                    this.logger.log(`Google account linked for user: ${email}`);
                } else {
                    // Create new user with Google
                    user = await this.supabaseService.createUser({
                        email,
                        name: name || email.split('@')[0],
                        googleId,
                        authProvider: 'google',
                        emailVerified: true,
                        profilePicture: picture,
                    });

                    // Send welcome email
                    await this.emailService.sendWelcomeEmail(email, name);

                    this.logger.log(`New user registered via Google: ${email}`);
                }
            } else {
                // Update profile picture if changed
                if (picture && user.profile_picture !== picture) {
                    user = await this.supabaseService.updateUser(user.id, {
                        profile_picture: picture,
                    });
                }

                this.logger.log(`User logged in via Google: ${email}`);
            }

            // Generate tokens
            const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

            return {
                message: 'Google authentication successful',
                user: this.sanitizeUser(user),
                accessToken,
                refreshToken,
            };
        } catch (error) {
            this.logger.error('Google auth error:', error);
            throw new UnauthorizedException('Invalid Google token');
        }
    }

    // ==================== Email Verification ====================

    async verifyEmail(token: string) {
        const tokenRecord = await this.supabaseService.findToken(
            token,
            'email_verification',
        );

        if (!tokenRecord) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        // Update user as verified
        const user = await this.supabaseService.updateUser(tokenRecord.user_id, {
            email_verified: true,
        });

        // Delete used token
        await this.supabaseService.deleteToken(token);

        // Send welcome email
        await this.emailService.sendWelcomeEmail(user.email, user.name);

        this.logger.log(`Email verified for user: ${user.email}`);

        return {
            message: 'Email verified successfully',
            user: this.sanitizeUser(user),
        };
    }

    async resendVerification(email: string) {
        const user = await this.supabaseService.findUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists
            return { message: 'If the email exists, a verification link has been sent' };
        }

        if (user.email_verified) {
            throw new BadRequestException('Email already verified');
        }

        // Delete old verification tokens
        await this.supabaseService.deleteUserTokens(user.id, 'email_verification');

        // Generate new verification token
        const verificationToken = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await this.supabaseService.saveVerificationToken(
            user.id,
            verificationToken,
            expiresAt,
            'email_verification',
        );

        // Send verification email
        await this.emailService.sendVerificationEmail(
            email,
            verificationToken,
            user.name,
        );

        return {
            message: 'Verification email sent successfully',
        };
    }

    // ==================== Password Reset ====================

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto;

        const user = await this.supabaseService.findUserByEmail(email);
        if (!user || user.auth_provider !== 'email') {
            // Don't reveal if email exists
            return {
                message: 'If the email exists, a password reset link has been sent',
            };
        }

        // Delete old reset tokens
        await this.supabaseService.deleteUserTokens(user.id, 'password_reset');

        // Generate reset token
        const resetToken = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

        await this.supabaseService.savePasswordResetToken(
            user.id,
            resetToken,
            expiresAt,
            'password_reset',
        );

        // Send reset email
        await this.emailService.sendPasswordResetEmail(
            email,
            resetToken,
            user.name,
        );

        this.logger.log(`Password reset requested for: ${email}`);

        return {
            message: 'If the email exists, a password reset link has been sent',
        };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { token, newPassword } = resetPasswordDto;

        const tokenRecord = await this.supabaseService.findToken(
            token,
            'password_reset',
        );

        if (!tokenRecord) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        const user = await this.supabaseService.updateUser(tokenRecord.user_id, {
            password_hash: passwordHash,
        });

        // Delete used token
        await this.supabaseService.deleteToken(token);

        // Revoke all refresh tokens for security
        await this.supabaseService.revokeAllUserRefreshTokens(user.id);

        // Send notification email
        await this.emailService.sendPasswordChangedNotification(user.email, user.name);

        this.logger.log(`Password reset for user: ${user.email}`);

        return {
            message: 'Password reset successfully',
        };
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        const { currentPassword, newPassword } = changePasswordDto;

        const user = await this.supabaseService.findUserById(userId);

        if (user.auth_provider !== 'email') {
            throw new BadRequestException(
                'Cannot change password for social login accounts',
            );
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            user.password_hash,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await this.supabaseService.updateUser(userId, {
            password_hash: passwordHash,
        });

        // Revoke all refresh tokens except current session
        await this.supabaseService.revokeAllUserRefreshTokens(userId);

        // Send notification email
        await this.emailService.sendPasswordChangedNotification(user.email, user.name);

        this.logger.log(`Password changed for user: ${user.email}`);

        return {
            message: 'Password changed successfully',
        };
    }

    // ==================== Token Management ====================

    async refreshToken(refreshTokenDto: RefreshTokenDto) {
        const { refreshToken } = refreshTokenDto;

        const tokenRecord = await this.supabaseService.findRefreshToken(refreshToken);
        if (!tokenRecord) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = await this.supabaseService.findUserById(tokenRecord.user_id);

        // Revoke old refresh token (token rotation)
        await this.supabaseService.revokeRefreshToken(refreshToken);

        // Generate new tokens
        const tokens = await this.generateTokens(user.id, user.email);

        return {
            message: 'Token refreshed successfully',
            ...tokens,
        };
    }

    async logout(userId: string, refreshToken: string) {
        // Revoke the refresh token
        await this.supabaseService.revokeRefreshToken(refreshToken);

        this.logger.log(`User logged out: ${userId}`);

        return {
            message: 'Logged out successfully',
        };
    }

    async logoutAllDevices(userId: string) {
        // Revoke all refresh tokens
        await this.supabaseService.revokeAllUserRefreshTokens(userId);

        // Delete all sessions
        await this.supabaseService.deleteAllUserSessions(userId);

        this.logger.log(`User logged out from all devices: ${userId}`);

        return {
            message: 'Logged out from all devices successfully',
        };
    }

    // ==================== Profile Management ====================

    async getProfile(userId: string) {
        const user = await this.supabaseService.findUserById(userId);
        return this.sanitizeUser(user);
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
        const user = await this.supabaseService.updateUser(userId, updateProfileDto);

        return {
            message: 'Profile updated successfully',
            user: this.sanitizeUser(user),
        };
    }

    async deleteAccount(userId: string) {
        // Delete all user data
        await this.supabaseService.revokeAllUserRefreshTokens(userId);
        await this.supabaseService.deleteAllUserSessions(userId);
        await this.supabaseService.deleteUserTokens(userId);
        await this.supabaseService.deleteUser(userId);

        this.logger.log(`Account deleted for user: ${userId}`);

        return {
            message: 'Account deleted successfully',
        };
    }

    // ==================== Helper Methods ====================

    private async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email };

        // Generate access token
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        });

        // Generate refresh token
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
        });

        // Save refresh token to database
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days
        await this.supabaseService.saveRefreshToken(userId, refreshToken, refreshTokenExpiry);

        return { accessToken, refreshToken };
    }

    private sanitizeUser(user: any) {
        const { password_hash, ...sanitized } = user;
        return {
            id: sanitized.id,
            email: sanitized.email,
            name: sanitized.name,
            emailVerified: sanitized.email_verified,
            profilePicture: sanitized.profile_picture,
            authProvider: sanitized.auth_provider,
            createdAt: sanitized.created_at,
        };
    }

    async validateUser(userId: string) {
        const user = await this.supabaseService.findUserById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return user;
    }
}
