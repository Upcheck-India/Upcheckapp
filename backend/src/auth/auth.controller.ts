import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
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
    VerifyEmailDto,
    ResendVerificationDto,
} from './dto/auth.dto';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
    constructor(private authService: AuthService) { }

    // ==================== Public Routes ====================

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Public()
    @Post('google')
    @HttpCode(HttpStatus.OK)
    async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
        return this.authService.googleAuth(googleAuthDto);
    }

    @Public()
    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
        return this.authService.verifyEmail(verifyEmailDto.token);
    }

    @Public()
    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
        return this.authService.resendVerification(resendVerificationDto.email);
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
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto);
    }

    // ==================== Protected Routes ====================

    @Get('profile')
    async getProfile(@GetUserId() userId: string) {
        return this.authService.getProfile(userId);
    }

    @Put('profile')
    async updateProfile(
        @GetUserId() userId: string,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.authService.updateProfile(userId, updateProfileDto);
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @GetUserId() userId: string,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(userId, changePasswordDto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @GetUserId() userId: string,
        @Body() refreshTokenDto: RefreshTokenDto,
    ) {
        return this.authService.logout(userId, refreshTokenDto.refreshToken);
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    async logoutAllDevices(@GetUserId() userId: string) {
        return this.authService.logoutAllDevices(userId);
    }

    @Delete('account')
    async deleteAccount(@GetUserId() userId: string) {
        return this.authService.deleteAccount(userId);
    }

    // ==================== Health Check ====================

    @Public()
    @Get('health')
    health() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
}
