import { Controller, Post, Body, Get, Headers, UseGuards, Res, Req, UnauthorizedException, Delete, Param, Query, Redirect } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { GoogleLoginDto, RegisterDto, LoginDto, VerifyOtpDto, Enable2faDto, Login2faDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('google')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.googleLogin(googleLoginDto);

        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Return refresh_token in body for Mobile App usage (Keychain)
        return {
            user: result.user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            supabase_access_token: result.supabase_access_token,
            supabase_refresh_token: result.supabase_refresh_token
        };
    }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(loginDto);

        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return {
            user: result.user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            supabase_access_token: result.supabase_access_token,
            supabase_refresh_token: result.supabase_refresh_token
        };
    }

    @Post('register/phone')
    async registerWithPhone(@Body() body: { phoneNumber: string }) {
        return this.authService.sendOtp(body.phoneNumber);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        const result = await this.authService.verifyOtp(verifyOtpDto, ip, userAgent);

        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return {
            user: result.user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            supabase_access_token: result.supabase_access_token,
            supabase_refresh_token: result.supabase_refresh_token
        };
    }

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

    @Post('2fa/login')
    async login2FA(@Body() body: Login2faDto, @Req() req: Request) {
        // We need to validate tempToken to get userId.
        // Ideally AuthService.loginWith2FA could take tempToken and validate it.
        // Or we decode it here.
        // Let's pass tempToken to AuthService and let it handle validation + upgrade.
        // But loginWith2FA in AuthService currently takes userId.
        // We should verify tempToken here or update AuthService.
        // Let's update AuthService to verify tempToken inside loginWith2FA?
        // Or parse it here. Validating here is cleaner for controller.
        // But I don't have JwtService injected here. AuthService has it.
        // I'll call a new method in AuthService: loginWith2FA(tempToken, code)

        // Wait, I implemented loginWith2FA(userId, token).
        // I should change it to loginWith2FA(tempToken, token).
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        return this.authService.loginWith2FA(body.tempToken, body.token, ip, userAgent);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.refreshToken, body.newPassword);
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    async changePassword(@CurrentUser() user: any, @Body() body: ChangePasswordDto) {
        return this.authService.changePassword(user.id, body.oldPassword, body.newPassword);
    }

    @Post('refresh')
    async refreshToken(@Req() req: Request, @Body() body: { refreshToken?: string }, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies['refresh_token'] || body.refreshToken;
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        const tokens = await this.authService.refreshToken(refreshToken, ip, userAgent);

        // Set new refresh token in cookie
        res.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return { access_token: tokens.access_token };
    }

    @Get('health')
    health() {
        return { status: 'ok' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@CurrentUser() user: any) {
        return user;
    }

    @Post('logout')
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies['refresh_token'];
        await this.authService.logout(refreshToken);

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/auth',
        });

        return { message: 'Logged out successfully' };
    }
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
}
