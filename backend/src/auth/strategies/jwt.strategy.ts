import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        // Supabase JWTs are HS256, signed with the project's JWT secret.
        // Find it at: Supabase Dashboard → Settings → API → JWT Secret
        // Add SUPABASE_JWT_SECRET to your Render environment variables.
        const supabaseJwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');
        if (!supabaseJwtSecret) {
            throw new Error('SUPABASE_JWT_SECRET is not set. Add it to your environment variables.');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: supabaseJwtSecret,
            algorithms: ['HS256'],
        });
    }

    async validate(payload: any) {
        this.logger.log(`validate() — sub: ${payload?.sub} | email: ${payload?.email} | role: ${payload?.role} | aud: ${payload?.aud} | exp: ${payload?.exp ? new Date(payload.exp * 1000).toISOString() : 'none'}`);

        if (!payload?.sub) {
            this.logger.error('validate() — JWT payload has no sub field! Rejecting.');
            throw new UnauthorizedException('Invalid token: missing sub');
        }

        try {
            const user = await this.authService.validateUser(payload.sub);
            if (user) {
                this.logger.log(`validate() — found user in public.users: id=${user.id} email=${user.email}`);
                return user;
            } else {
                this.logger.warn(`validate() — user ${payload.sub} NOT found in public.users. Run supabase_setup.sql backfill. Falling back to JWT payload.`);
            }
        } catch (err: any) {
            this.logger.error(`validate() — DB lookup threw: ${err.message}. Falling back to JWT payload.`);
        }

        // JWT signature already verified by passport-jwt — safe to trust payload.
        this.logger.log(`validate() — returning minimal user from JWT payload for sub: ${payload.sub}`);
        return { id: payload.sub, email: payload.email };
    }
}
