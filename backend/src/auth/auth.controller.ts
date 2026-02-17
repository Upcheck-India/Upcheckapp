import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    Req,
    Param,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public, GetUserId } from './decorators/auth.decorators';
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

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
        return this.authService.register(registerDto, req.ip, req.headers['user-agent']);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        return this.authService.login(loginDto, req.ip, req.headers['user-agent']);
    }

    @Public()
    @Post('login/otp/request')
    @HttpCode(HttpStatus.OK)
    async requestOtpLogin(@Body() dto: LoginOtpRequestDto) {
        return this.authService.requestOtpLogin(dto);
    }

    @Public()
    @Post('login/otp/verify')
    @HttpCode(HttpStatus.OK)
    async verifyOtpLogin(@Body() dto: LoginOtpVerifyDto, @Req() req: Request) {
        return this.authService.verifyOtpLogin(dto, req.ip, req.headers['user-agent']);
    }

    @Public()
    @Post('google')
    @HttpCode(HttpStatus.OK)
    async googleAuth(@Body() googleAuthDto: GoogleAuthDto, @Req() req: Request) {
        return this.authService.googleAuth(googleAuthDto, req.ip, req.headers['user-agent']);
    }

    @Post('google/link')
    @HttpCode(HttpStatus.OK)
    async linkGoogleAccount(@GetUserId() userId: string, @Body() googleAuthDto: GoogleAuthDto) {
        return this.authService.linkGoogleAccount(userId, googleAuthDto);
    }

    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto);
    }

    @Public()
    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
        return this.authService.refreshToken(refreshTokenDto, req.ip, req.headers['user-agent']);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@GetUserId() userId: string, @Body('refreshToken') refreshToken: string) {
        return this.authService.logout(userId, refreshToken);
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    async logoutAll(@GetUserId() userId: string) {
        return this.authService.logoutAllDevices(userId);
    }

    @Get('me')
    @HttpCode(HttpStatus.OK)
    async getProfile(@GetUserId() userId: string) {
        return this.authService.getProfile(userId);
    }

    @Post('me')
    @HttpCode(HttpStatus.OK)
    async updateProfile(@GetUserId() userId: string, @Body() updateProfileDto: UpdateProfileDto) {
        return this.authService.updateProfile(userId, updateProfileDto);
    }

    @Delete('account')
    // Spec says DELETE /auth/account
    @HttpCode(HttpStatus.OK)
    async deleteAccount(@GetUserId() userId: string) {
        // Should prompt for password if recent, but for now just delete
        return this.authService.deleteAccount(userId);
    }

    @Public()
    @Post('verify-email') // Service: verifyEmail(token)
    @HttpCode(HttpStatus.OK)
    async verifyEmail(@Body('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Get('sessions')
    @HttpCode(HttpStatus.OK)
    async getSessions(@GetUserId() userId: string) {
        return this.authService.getSessions(userId);
    }

    @Delete('sessions/:id')
    @HttpCode(HttpStatus.OK)
    async revokeSession(@GetUserId() userId: string, @Param('id') sessionId: string) {
        return this.authService.revokeSession(userId, sessionId);
    }

    @Public()
    @Post('verify-email/resend')
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body('email') email: string) {
        return this.authService.resendVerification(email);
    }

    @Post('2fa/setup')
    @HttpCode(HttpStatus.OK)
    async setupTwoFactor(@GetUserId() userId: string) {
        return this.authService.setupTwoFactor(userId);
    }

    @Post('2fa/enable')
    @HttpCode(HttpStatus.OK)
    async enableTwoFactor(@GetUserId() userId: string, @Body('token') token: string) {
        return this.authService.enableTwoFactor(userId, token);
    }

    @Public()
    @Post('2fa/login') // Verify 2FA challenge during login
    @HttpCode(HttpStatus.OK)
    async verifyTwoFactorLogin(
        @Body('tempToken') tempToken: string,
        @Body('token') code: string,
        @Req() req: Request
    ) {
        return this.authService.verifyTwoFactorLogin(tempToken, code, req.ip, req.headers['user-agent']);
    }
}
