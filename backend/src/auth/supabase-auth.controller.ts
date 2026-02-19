import { Controller, Post, Get, Body, UseGuards, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@Controller('auth/supabase')
export class SupabaseAuthController {
    constructor(private supabaseAuthService: SupabaseAuthService) {}

    // ==================== Email/Password Auth ====================

    @Post('signup')
    async signup(@Body() body: { email: string; password: string; firstName?: string; lastName?: string; username?: string }) {
        const { email, password, firstName, lastName, username } = body;

        if (!email || !password) {
            throw new BadRequestException('Email and password are required');
        }

        const result = await this.supabaseAuthService.signUp(email, password, {
            firstName,
            lastName,
            username,
        });

        return {
            message: 'Registration successful. Please check your email for verification.',
            user: result.user,
            session: result.session,
        };
    }

    @Post('signin')
    async signin(@Body() body: { email: string; password: string }) {
        const { email, password } = body;

        if (!email || !password) {
            throw new BadRequestException('Email and password are required');
        }

        const result = await this.supabaseAuthService.signIn(email, password);

        return {
            message: 'Login successful',
            user: result.user,
            session: result.session,
        };
    }

    // ==================== OAuth ====================

    @Post('oauth/google')
    async googleOAuth(@Body() body: { idToken: string }) {
        const { idToken } = body;

        if (!idToken) {
            throw new BadRequestException('ID token is required');
        }

        const result = await this.supabaseAuthService.signInWithIdToken('google', idToken);

        return {
            message: 'Google authentication successful',
            user: result.user,
            session: result.session,
        };
    }

    // ==================== Session Management ====================

    @Post('refresh')
    async refresh(@Body() body: { refreshToken: string }) {
        const { refreshToken } = body;

        if (!refreshToken) {
            throw new BadRequestException('Refresh token is required');
        }

        const result = await this.supabaseAuthService.refreshSession(refreshToken);

        return {
            message: 'Session refreshed',
            user: result.user,
            session: result.session,
        };
    }

    @Post('signout')
    @UseGuards(SupabaseAuthGuard)
    async signout(@Req() request: any) {
        const token = request.headers.authorization?.substring(7); // Remove 'Bearer '
        
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        return await this.supabaseAuthService.signOut(token);
    }

    // ==================== User Management ====================

    @Get('me')
    @UseGuards(SupabaseAuthGuard)
    async getCurrentUser(@CurrentUser() user: User) {
        return {
            user,
        };
    }

    @Post('update')
    @UseGuards(SupabaseAuthGuard)
    async updateUser(
        @CurrentUser() user: User,
        @Body() body: { email?: string; password?: string; data?: any }
    ) {
        const updatedUser = await this.supabaseAuthService.updateUser(user.id, body);

        return {
            message: 'User updated successfully',
            user: updatedUser,
        };
    }

    // ==================== Password Management ====================

    @Post('forgot-password')
    async forgotPassword(@Body() body: { email: string }) {
        const { email } = body;

        if (!email) {
            throw new BadRequestException('Email is required');
        }

        return await this.supabaseAuthService.sendPasswordResetEmail(email);
    }

    @Post('update-password')
    @UseGuards(SupabaseAuthGuard)
    async updatePassword(
        @Req() request: any,
        @Body() body: { newPassword: string }
    ) {
        const token = request.headers.authorization?.substring(7);
        const { newPassword } = body;

        if (!newPassword) {
            throw new BadRequestException('New password is required');
        }

        return await this.supabaseAuthService.updatePassword(token, newPassword);
    }

    // ==================== Email Verification ====================

    @Post('resend-verification')
    async resendVerification(@Body() body: { email: string }) {
        const { email } = body;

        if (!email) {
            throw new BadRequestException('Email is required');
        }

        return await this.supabaseAuthService.sendVerificationEmail(email);
    }
}
