import { Controller, Post, Body, Get, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('login/otp')
    sendOtp(@Body() sendOtpDto: SendOtpDto) {
        return this.authService.sendOtp(sendOtpDto);
    }

    @Post('verify-otp')
    verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto);
    }

    @Post('login-with-otp')
    loginWithOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.loginWithOtp(verifyOtpDto);
    }

    @Post('refresh')
    refreshToken(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
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
    @UseGuards(JwtAuthGuard)
    logout(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.authService.logout(token);
    }
}
