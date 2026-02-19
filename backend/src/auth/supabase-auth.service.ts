import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthService {
    private supabase: SupabaseClient;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL and Service Role Key must be configured');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    // ==================== Email/Password Auth ====================

    async signUp(email: string, password: string, metadata?: { firstName?: string; lastName?: string; username?: string }) {
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata || {},
            },
        });

        if (error) {
            if (error.message.includes('already registered')) {
                throw new ConflictException('Email already registered');
            }
            throw new BadRequestException(error.message);
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    async signIn(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    // ==================== OAuth ====================

    /**
     * Verify OAuth token from frontend (id_token from Google)
     * Note: Frontend should use Supabase Auth UI or handle OAuth flow with deep linking
     */
    async signInWithIdToken(provider: 'google', idToken: string) {
        const { data, error } = await this.supabase.auth.signInWithIdToken({
            provider,
            token: idToken,
        });

        if (error) {
            throw new UnauthorizedException(error.message);
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    // ==================== Token Validation ====================

    async verifyAccessToken(token: string): Promise<User> {
        const { data, error } = await this.supabase.auth.getUser(token);

        if (error || !data.user) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        return data.user;
    }

    // ==================== Session Management ====================

    async refreshSession(refreshToken: string) {
        const { data, error } = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    async signOut(accessToken: string) {
        // Revoke the session
        const { error } = await this.supabase.auth.admin.signOut(accessToken);

        if (error) {
            throw new BadRequestException(error.message);
        }

        return { message: 'Signed out successfully' };
    }

    // ==================== User Management ====================

    async updateUser(userId: string, updates: { email?: string; password?: string; data?: any }) {
        const { data, error } = await this.supabase.auth.admin.updateUserById(userId, updates);

        if (error) {
            throw new BadRequestException(error.message);
        }

        return data.user;
    }

    async getUserById(userId: string) {
        const { data, error } = await this.supabase.auth.admin.getUserById(userId);

        if (error) {
            throw new BadRequestException(error.message);
        }

        return data.user;
    }

    async deleteUser(userId: string) {
        const { error } = await this.supabase.auth.admin.deleteUser(userId);

        if (error) {
            throw new BadRequestException(error.message);
        }

        return { message: 'User deleted successfully' };
    }

    // ==================== Password Management ====================

    async sendPasswordResetEmail(email: string) {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${this.configService.get('FRONTEND_URL')}/reset-password`,
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        return { message: 'Password reset email sent' };
    }

    async updatePassword(accessToken: string, newPassword: string) {
        // First verify the token
        const user = await this.verifyAccessToken(accessToken);

        // Update password
        const { error } = await this.supabase.auth.admin.updateUserById(user.id, {
            password: newPassword,
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        return { message: 'Password updated successfully' };
    }

    // ==================== Email Verification ====================

    async sendVerificationEmail(email: string) {
        const { error } = await this.supabase.auth.resend({
            type: 'signup',
            email,
        });

        if (error) {
            throw new BadRequestException(error.message);
        }

        return { message: 'Verification email sent' };
    }

    // ==================== Helpers ====================

    getClient(): SupabaseClient {
        return this.supabase;
    }
}
