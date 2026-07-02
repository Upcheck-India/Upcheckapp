import { Injectable, UnauthorizedException, BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import * as crypto from 'crypto';

@Injectable()
export class SupabaseAuthService {
    private supabase: SupabaseClient;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get('SUPABASE_ANON_KEY');
        const supabaseKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseAnonKey || !supabaseKey) {
            throw new Error(
                `Missing Supabase env vars.\n` +
                `SUPABASE_URL: ${!!supabaseUrl}\n` +
                `SUPABASE_ANON_KEY: ${!!supabaseAnonKey}\n` +
                `SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseKey}`
            );
        }

        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    // ==================== Email/Password Auth ====================

    async signUp(email: string, password: string, metadata?: { firstName?: string; lastName?: string; username?: string; account_type?: 'owner' | 'worker' }) {
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

    // ==================== Passwordless email OTP ====================

    /**
     * Send a one-time login code to an existing user's email (Supabase native
     * OTP). `shouldCreateUser: false` keeps this a *login* flow — it will not
     * silently provision a new account for an unknown email.
     */
    async sendEmailOtp(email: string) {
        const { error } = await this.supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
        });
        if (error) {
            throw new BadRequestException(error.message);
        }
        return { message: 'A login code has been sent to your email.' };
    }

    /** Verify an emailed OTP and return a full session. */
    async verifyEmailOtp(email: string, token: string) {
        const { data, error } = await this.supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });
        if (error) {
            throw new UnauthorizedException(error.message);
        }
        return { user: data.user, session: data.session };
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

    // ==================== Truecaller Auth ====================

    async signInWithTruecaller(profile: {
        phoneNumber: string;
        firstName: string;
        lastName?: string;
        email?: string;
        avatarUrl?: string;
    }) {
        // 1. Check if user exists by phone number
        const { data: existingUser, error: lookupError } = await this.supabase
            .from('users')
            .select('*')
            .eq('phone', profile.phoneNumber)
            .single();

        if (existingUser) {
            // 2a. Existing user - update phone_verified and create session
            await this.supabase
                .from('users')
                .update({ phone_verified: true, auth_provider: 'truecaller' })
                .eq('id', existingUser.id);

            return this.createSessionForUser(existingUser.id, profile);
        }

        // 2b. New user - check if email exists
        if (profile.email) {
            const { data: emailUser } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', profile.email)
                .single();

            if (emailUser) {
                // Link phone to existing email user
                await this.supabase
                    .from('users')
                    .update({
                        phone: profile.phoneNumber,
                        phone_verified: true,
                        auth_provider: 'truecaller',
                    })
                    .eq('id', emailUser.id);

                return this.createSessionForUser(emailUser.id, profile);
            }
        }

        // 3. Create new user (Branch 3 — Requirement 11.4)
        const tempEmail = profile.email || `${profile.phoneNumber.replace(/[^0-9]/g, '')}@truecaller.temp`;

        const { data: newUser, error: createError } = await this.supabase.auth.admin.createUser({
            email: tempEmail,
            phone: profile.phoneNumber,
            password: crypto.randomUUID(),
            email_confirm: !!profile.email,
            phone_confirm: true,
            user_metadata: {
                first_name: profile.firstName,
                last_name: profile.lastName,
                avatar_url: profile.avatarUrl,
                provider: 'truecaller',
                phone_verified: true,
            },
        });

        if (createError) {
            // Supabase infra failure (outage, rate limit, etc.), not a client
            // validation error — a 5xx here keeps it visible to monitoring
            // instead of being remapped to a misleading 401 by
            // TruecallerInvalidRequestFilter (which only catches
            // BadRequestException).
            throw new ServiceUnavailableException(createError.message);
        }

        // The auth user now exists. From this point on, ANY failure must
        // delete it via supabase.auth.admin.deleteUser(authUserId) so the
        // system never holds an auth user without a corresponding users
        // row. This rollback is required by the design's
        // "Failure-mode considerations" section and is a corollary of
        // Property 8 (idempotence): leaving an orphan auth user would
        // break the next call's phone-match branch because Supabase
        // would reject re-creation of the same phone or email.
        const newAuthUserId = newUser.user.id;
        try {
            // Create user record in our DB
            const { error: dbError } = await this.supabase.from('users').insert({
                id: newAuthUserId,
                email: profile.email || null,
                phone: profile.phoneNumber,
                first_name: profile.firstName,
                last_name: profile.lastName,
                avatar_url: profile.avatarUrl,
                auth_provider: 'truecaller',
                phone_verified: true,
                email_verified: !!profile.email,
            });

            if (dbError) {
                // Same reasoning as createError above — surface DB outages as
                // 5xx, not a masked 401.
                throw new ServiceUnavailableException(dbError.message);
            }
        } catch (insertErr) {
            // Best-effort rollback. We deliberately swallow rollback
            // failures: the original insert error is more useful to the
            // caller, and any leftover orphan auth user can be reaped by
            // a follow-up admin job. We do NOT log the failed delete in
            // production at the phone-number level — Requirement 13.1.
            try {
                await this.supabase.auth.admin.deleteUser(newAuthUserId);
            } catch {
                // Intentionally ignored — see comment above.
            }
            throw insertErr;
        }

        // The auth user + users row both exist now — mint a real session the
        // same way the existing-user branches do.
        const session = await this.mintSession(tempEmail);
        return { user: newUser.user, session };
    }

    /**
     * Redeem an admin-generated magic link into a real session server-side.
     * `admin.generateLink` never returns a live session (its `action_link` is
     * always populated), so the only way to mint one out-of-band is to verify
     * the link's `hashed_token` through the public `verifyOtp` API — the
     * documented Supabase pattern for admin-issued sign-in.
     */
    private async mintSession(email: string) {
        const { data: linkData, error: linkError } =
            await this.supabase.auth.admin.generateLink({
                type: 'magiclink',
                email,
            });

        if (linkError) {
            throw new ServiceUnavailableException(linkError.message);
        }

        const { data: verifyData, error: verifyError } = await this.supabase.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'magiclink',
        });

        if (verifyError || !verifyData.session) {
            throw new ServiceUnavailableException(
                verifyError?.message ?? 'Failed to create session',
            );
        }

        return verifyData.session;
    }

    private async createSessionForUser(
        userId: string,
        profile: { firstName: string; lastName?: string; avatarUrl?: string },
    ) {
        // Update user metadata
        const { data, error } = await this.supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
                first_name: profile.firstName,
                last_name: profile.lastName,
                avatar_url: profile.avatarUrl,
                provider: 'truecaller',
            },
        });

        if (error) {
            // Supabase infra failure, not client validation — surface as 5xx
            // (see createError/dbError above).
            throw new ServiceUnavailableException(error.message);
        }

        const userEmail = data.user.email ?? '';
        if (!userEmail) {
            throw new BadRequestException('User email is required to create session');
        }

        const session = await this.mintSession(userEmail);
        return { user: data.user, session };
    }

    // ==================== Helpers ====================

    getClient(): SupabaseClient {
        return this.supabase;
    }
}
