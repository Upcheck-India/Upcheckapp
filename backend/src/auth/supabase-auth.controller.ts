import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException, UnauthorizedException, ValidationPipe, HttpCode, HttpStatus, Catch, ExceptionFilter, ArgumentsHost, UseFilters } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseAuthService } from './supabase-auth.service';
import { TruecallerService, VerifiedTruecallerProfile } from './truecaller.service';
import { TwoFactorService } from './two-factor.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/auth.decorators';
import { TruecallerAuthDto } from './dto/truecaller-auth.dto';
import { TruecallerOAuthExchangeDto } from './dto/truecaller-oauth-exchange.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { Login2faDto } from './dto/login-2fa.dto';
import { LoginOtpRequestDto, LoginOtpVerifyDto } from './dto/login-otp.dto';
import { RedisService } from '../redis/redis.service';
import type { User } from '@supabase/supabase-js';

const TWO_FA_TEMP_PREFIX = 'auth:2fa:temp:';
const TWO_FA_TEMP_TTL_SECONDS = 300;

/**
 * Method-level validation pipe for {@link SupabaseAuthController.truecallerOAuth}.
 *
 * The default global `ValidationPipe` translates DTO failures into HTTP 400
 * `BadRequestException`, but Requirement 13.4 mandates that
 * `POST /auth/supabase/oauth/truecaller` responds with HTTP 401 and the
 * body `{ success: false, message: 'Invalid request' }` for *every*
 * malformed body (including the class-level XOR invariant in
 * {@link TruecallerAuthDto}). Overriding `exceptionFactory` here keeps
 * that mapping local to the Truecaller route without affecting any other
 * endpoint, and crucially does not echo the offending field's value back
 * to the caller.
 */
const truecallerValidationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    exceptionFactory: () =>
        new UnauthorizedException({
            success: false,
            message: 'Invalid request',
        }),
});

/**
 * Route-scoped exception filter that maps any `BadRequestException` raised
 * during request handling into the Requirement 13.4 envelope.
 *
 * Why this filter exists: Nest's pipe-resolution order applies *global*
 * pipes before parameter-level pipes, so the global `ValidationPipe`
 * registered in `main.ts` will throw a default `BadRequestException`
 * (HTTP 400) the moment DTO validation fails — long before the
 * `truecallerValidationPipe` above gets a chance to substitute its 401
 * envelope. The param-level pipe alone is therefore not sufficient to
 * satisfy Requirement 13.4 in production.
 *
 * The filter does not include any details from the underlying exception
 * (`response.message`, `response.errors`, etc.) so the offending field's
 * value cannot leak into the response — also a Requirement 13.4
 * obligation.
 */
@Catch(BadRequestException)
export class TruecallerInvalidRequestFilter implements ExceptionFilter {
    catch(_exception: BadRequestException, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse();
        response.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid request',
        });
    }
}

@Controller('auth/supabase')
export class SupabaseAuthController {
    constructor(
        private supabaseAuthService: SupabaseAuthService,
        private truecallerService: TruecallerService,
        private twoFactorService: TwoFactorService,
        private redisService: RedisService,
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

        // If the account has TOTP 2FA enabled, do not hand back the session yet.
        // Stash it under a short-lived temp token and require a code via
        // POST /auth/supabase/2fa/login.
        if (result.user && (await this.twoFactorService.isEnabled(result.user.id))) {
            const tempToken = randomUUID();
            await this.redisService.set(
                `${TWO_FA_TEMP_PREFIX}${tempToken}`,
                JSON.stringify({ userId: result.user.id, session: result.session }),
                'EX',
                TWO_FA_TEMP_TTL_SECONDS,
            );
            return { requires2FA: true, tempToken };
        }

        return {
            message: 'Login successful',
            user: result.user,
            session: result.session,
        };
    }

    // ==================== Passwordless email OTP login ====================

    @Public()
    @Post('login-otp/request')
    @HttpCode(HttpStatus.OK)
    async requestLoginOtp(@Body() body: LoginOtpRequestDto) {
        return this.supabaseAuthService.sendEmailOtp(body.email);
    }

    @Public()
    @Post('login-otp/verify')
    @HttpCode(HttpStatus.OK)
    async verifyLoginOtp(@Body() body: LoginOtpVerifyDto) {
        const result = await this.supabaseAuthService.verifyEmailOtp(body.email, body.otp);
        return { message: 'Login successful', user: result.user, session: result.session };
    }

    // ==================== Two-factor authentication (TOTP) ====================

    @Public()
    @Post('2fa/login')
    @HttpCode(HttpStatus.OK)
    async twoFactorLogin(@Body() body: Login2faDto) {
        const raw = await this.redisService.get(`${TWO_FA_TEMP_PREFIX}${body.tempToken}`);
        if (!raw) {
            throw new UnauthorizedException('2FA challenge expired or invalid. Please sign in again.');
        }
        const { userId, session } = JSON.parse(raw);
        const ok = await this.twoFactorService.verifyCode(userId, body.token);
        if (!ok) {
            throw new UnauthorizedException('Invalid verification code');
        }
        await this.redisService.del(`${TWO_FA_TEMP_PREFIX}${body.tempToken}`);
        return { message: 'Login successful', session };
    }

    @UseGuards(SupabaseAuthGuard)
    @Post('2fa/setup')
    async twoFactorSetup(@CurrentUser() user) {
        return this.twoFactorService.setup(user.id);
    }

    @UseGuards(SupabaseAuthGuard)
    @Post('2fa/enable')
    async twoFactorEnable(@CurrentUser() user, @Body() body: Enable2faDto) {
        return this.twoFactorService.enable(user.id, body.token);
    }

    @UseGuards(SupabaseAuthGuard)
    @Post('2fa/disable')
    async twoFactorDisable(@CurrentUser() user, @Body() body: Disable2faDto) {
        return this.twoFactorService.disable(user.id, body.token);
    }

    @UseGuards(SupabaseAuthGuard)
    @Get('2fa/status')
    async twoFactorStatus(@CurrentUser() user) {
        return this.twoFactorService.status(user.id);
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
    // Requirement 11.5: response status MUST match POST /auth/supabase/signin,
    // which returns HTTP 200. Without this Nest defaults POST to 201, which
    // would silently break the parity required by the spec.
    @HttpCode(HttpStatus.OK)
    // Requirement 13.4: validation failures (whether raised by the global
    // pipe or anywhere downstream of it) must surface as HTTP 401 with
    // `{ success: false, message: 'Invalid request' }`. The route-scoped
    // filter intercepts any BadRequestException reaching the handler and
    // translates it into that envelope, regardless of which pipe raised
    // it. UnauthorizedException raised by the verifier or the
    // method-level pipe is intentionally NOT caught here so the
    // verifier's spec messages (Requirements 9.x / 10.x) pass through
    // unchanged.
    @UseFilters(TruecallerInvalidRequestFilter)
    async truecallerOAuth(
        @Body(truecallerValidationPipe) body: TruecallerAuthDto,
    ) {
        const {
            payload,
            signature,
            signatureAlgorithm,
            requestNonce,
            accessToken,
            phoneNumber,
        } = body;

        // Belt-and-suspenders: the DTO already enforces XOR on
        // accessToken/payload via the class-level constraint, but the
        // controller still re-checks the discriminator before dispatching
        // so a bug in the DTO cannot slip an unverified body through to
        // signInWithTruecaller. Both branches throw 401 with the
        // Requirement 13.4 message via the validation pipe above; this
        // residual check covers the case where validation has been
        // bypassed (e.g., direct method invocation in tests).
        let verifiedProfile: VerifiedTruecallerProfile;
        if (payload) {
            // Flow A (One-Tap) and PROFILE_VERIFIED_BEFORE.
            // Verification failures bubble up as UnauthorizedException
            // with the exact spec messages from Requirements 9.3, 9.5,
            // 9.6, 9.7 — Nest maps that to HTTP 401 directly.
            verifiedProfile = await this.truecallerService.verifySignedPayload({
                payload,
                signature: signature ?? '',
                signatureAlgorithm: signatureAlgorithm ?? '',
                requestNonce: requestNonce ?? '',
            });
        } else if (accessToken) {
            // Flow B (OTP / missed-call). Failures throw with the exact
            // spec messages from Requirements 10.2, 10.3, 10.4.
            verifiedProfile = await this.truecallerService.verifyAccessToken(
                accessToken,
                phoneNumber,
            );
        } else {
            throw new UnauthorizedException({
                success: false,
                message: 'Invalid request',
            });
        }

        // Requirement 11.1: signInWithTruecaller is called with values
        // sourced from the *verified* Truecaller profile, never from the
        // request body. The request body's firstName/lastName are
        // intentionally ignored here — a malicious client could otherwise
        // forge identity fields that would later land in the users row.
        const result = await this.supabaseAuthService.signInWithTruecaller({
            phoneNumber: verifiedProfile.phoneNumber,
            firstName: verifiedProfile.firstName || 'User',
            lastName: verifiedProfile.lastName,
            email: verifiedProfile.email,
            avatarUrl: verifiedProfile.avatarUrl,
        });

        // Requirement 11.5: response shape matches POST /auth/supabase/signin.
        return {
            message: 'Truecaller authentication successful',
            user: result.user,
            session: result.session,
        };
    }

    /**
     * Truecaller OAuth 2.0 One-Tap exchange.
     *
     * The mobile SDK (`@dhana-cs/react-native-truecaller`) returns an
     * authorization code + PKCE `codeVerifier`; this endpoint completes the
     * server-to-server exchange and mints a Supabase session. This is the
     * current/working path — the legacy `POST oauth/truecaller` route above
     * (signed payload / OTP access token) is retained for backwards
     * compatibility only.
     *
     * Identity fields come solely from Truecaller's verified userinfo
     * response, never from the request body.
     */
    @Public()
    @Post('oauth/truecaller/exchange')
    @HttpCode(HttpStatus.OK)
    @UseFilters(TruecallerInvalidRequestFilter)
    async truecallerOAuthExchange(
        @Body(truecallerValidationPipe) body: TruecallerOAuthExchangeDto,
    ) {
        const verifiedProfile = await this.truecallerService.verifyOAuthCode(
            body.authorizationCode,
            body.codeVerifier,
        );

        const result = await this.supabaseAuthService.signInWithTruecaller({
            phoneNumber: verifiedProfile.phoneNumber,
            firstName: verifiedProfile.firstName || 'User',
            lastName: verifiedProfile.lastName,
            email: verifiedProfile.email,
            avatarUrl: verifiedProfile.avatarUrl,
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
