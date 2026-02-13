import { Controller, Post, Body, Get, UseGuards, Res, Req, UnauthorizedException, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
    GoogleLoginDto, RegisterDto, LoginDto, VerifyOtpDto,
    Enable2faDto, Login2faDto, ForgotPasswordDto, ResetPasswordDto,
    ChangePasswordDto, Disable2faDto, DeleteAccountDto, ResendVerificationDto, SendOtpDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

// ─── Helper: Cookie options ──────────────────────────────────────
const REFRESH_COOKIE_OPTIONS = (maxAgeDays = 7) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
});

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ─── Google Login ────────────────────────────────────────────
    @Post('google')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    async googleLogin(
        @Body() googleLoginDto: GoogleLoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        const result = await this.authService.googleLogin(googleLoginDto, ip, userAgent);

        // If 2FA required, don't set cookie
        if (result.requires2fa) {
            return result;
        }

        res.cookie('refresh_token', result.refresh_token, REFRESH_COOKIE_OPTIONS());

        return {
            user: result.user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            supabase_access_token: result.supabase_access_token,
            supabase_refresh_token: result.supabase_refresh_token,
        };
    }

    // ─── Email/Password Register ─────────────────────────────────
    @Post('register')
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        return this.authService.register(registerDto, ip, userAgent);
    }

    // ─── Email/Password Login ────────────────────────────────────
    @Post('login')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        const result = await this.authService.login(loginDto, ip, userAgent);

        // If 2FA required, don't set cookie
        if (result.requires2fa) {
            return result;
        }

        const maxAgeDays = result.refresh_token_expiry_days || 7;
        res.cookie('refresh_token', result.refresh_token, REFRESH_COOKIE_OPTIONS(maxAgeDays));

        return {
            user: result.user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            requires2fa: result.requires2fa,
            supabase_access_token: result.supabase_access_token,
            supabase_refresh_token: result.supabase_refresh_token,
        };
    }

    // ─── Phone OTP ───────────────────────────────────────────────
    @Post('otp/send')
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @HttpCode(HttpStatus.OK)
    async sendOtp(@Body() body: SendOtpDto) {
        return this.authService.sendOtp(body.phoneNumber);
    }

    @Post('otp/verify')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    async verifyOtp(
        @Body() verifyOtpDto: VerifyOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        const result = await this.authService.verifyOtp(verifyOtpDto, ip, userAgent);

        // If 2FA required, don't set cookie
        if (result.requires2fa) {
            return result;
        }

        res.cookie('refresh_token', result.refresh_token, REFRESH_COOKIE_OPTIONS());

        return {
            user: result.user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            requires2fa: result.requires2fa,
            supabase_access_token: result.supabase_access_token,
            supabase_refresh_token: result.supabase_refresh_token,
        };
    }

    // ─── Email Verification ──────────────────────────────────────
    @Post('verify-email/resend')
    @Throttle({ default: { ttl: 60000, limit: 2 } })
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body() body: ResendVerificationDto) {
        return this.authService.resendVerificationEmail(body.email);
    }

    // ─── 2FA ─────────────────────────────────────────────────────
    @Post('2fa/setup')
    @UseGuards(JwtAuthGuard)
    async setup2FA(@CurrentUser() user: any) {
        return this.authService.setup2FA(user.id);
    }

    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    async enable2FA(@CurrentUser() user: any, @Body() body: Enable2faDto) {
        return this.authService.enable2FA(user.id, body.token);
    }

    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async disable2FA(@CurrentUser() user: any, @Body() body: Disable2faDto) {
        return this.authService.disable2FA(user.id, body.token);
    }

    @Post('2fa/backup-codes/regenerate')
    @UseGuards(JwtAuthGuard)
    async regenerateBackupCodes(@CurrentUser() user: any, @Body() body: Enable2faDto) {
        return this.authService.regenerateBackupCodes(user.id, body.token);
    }

    @Post('2fa/login')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    async login2FA(
        @Body() body: Login2faDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        const result = await this.authService.loginWith2FA(body.tempToken, body.token, ip, userAgent);

        res.cookie('refresh_token', result.refresh_token, REFRESH_COOKIE_OPTIONS());

        return {
            user: result.user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
        };
    }

    // ─── Password Management ─────────────────────────────────────
    @Post('forgot-password')
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.refreshToken, body.newPassword);
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async changePassword(@CurrentUser() user: any, @Body() body: ChangePasswordDto) {
        return this.authService.changePassword(user.id, body.oldPassword, body.newPassword);
    }

    // ─── Token Refresh ───────────────────────────────────────────
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(
        @Req() req: Request,
        @Body() body: { refreshToken?: string },
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.['refresh_token'] || body.refreshToken;
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        const tokens = await this.authService.refreshToken(refreshToken, ip, userAgent);

        res.cookie('refresh_token', tokens.refresh_token, REFRESH_COOKIE_OPTIONS());

        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        };
    }

    // ─── Health ──────────────────────────────────────────────────
    @SkipThrottle()
    @Get('health')
    health() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }

    // ─── Get Current User ────────────────────────────────────────
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@CurrentUser() user: any) {
        return this.authService.getUser(user.id);
    }

    // ─── Logout ──────────────────────────────────────────────────
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() req: Request,
        @Body() body: { refreshToken?: string },
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.['refresh_token'] || body.refreshToken;
        await this.authService.logout(refreshToken);

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth',
        });

        return { message: 'Logged out successfully' };
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logoutAll(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.logoutAllDevices(user.id);

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth',
        });

        return result;
    }

    // ─── Session Management ──────────────────────────────────────
    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async getSessions(@CurrentUser() user: any) {
        return this.authService.getSessions(user.id);
    }

    @Delete('sessions/:id')
    @UseGuards(JwtAuthGuard)
    async revokeSession(@CurrentUser() user: any, @Param('id') sessionId: string) {
        return this.authService.revokeSession(user.id, sessionId);
    }

    // ─── Account Management ──────────────────────────────────────
    @Delete('account')
    @UseGuards(JwtAuthGuard)
    async deleteAccount(@CurrentUser() user: any, @Body() body: DeleteAccountDto) {
        return this.authService.deleteAccount(user.id, body.password);
    }
}
