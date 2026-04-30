import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { TruecallerService } from './truecaller.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/auth.decorators';
import { TruecallerAuthDto } from './dto/truecaller-auth.dto';
import type { User } from '@supabase/supabase-js';

@Controller('auth/supabase')
export class SupabaseAuthController {
    constructor(
        private supabaseAuthService: SupabaseAuthService,
        private truecallerService: TruecallerService,
    ) { }

    // ==================== Email/Password Auth ====================

    @Public()
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

    @Public()
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

    @Public()
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

    @Public()
    @Post('oauth/truecaller')
    async truecallerOAuth(@Body() body: TruecallerAuthDto) {
        const { accessToken, phoneNumber, firstName, lastName, email, avatarUrl } = body;

        if (!accessToken || !phoneNumber) {
            throw new BadRequestException('Access token and phone number are required');
        }

        // Verify with Truecaller service
        const isValid = await this.truecallerService.verifyAccessToken(accessToken, phoneNumber);
        if (!isValid) {
            throw new UnauthorizedException('Invalid Truecaller credentials');
        }

        const result = await this.supabaseAuthService.signInWithTruecaller({
            phoneNumber,
            firstName: firstName || 'User',
            lastName,
            email,
            avatarUrl,
        });

        return {
            message: 'Truecaller authentication successful',
            user: result.user,
            session: result.session,
        };
    }

    // ==================== Session Management ====================

    @Public()
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

    @Public()
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

    @Public()
    @Post('resend-verification')
    async resendVerification(@Body() body: { email: string }) {
        const { email } = body;

        if (!email) {
            throw new BadRequestException('Email is required');
        }

        return await this.supabaseAuthService.sendVerificationEmail(email);
    }
}
