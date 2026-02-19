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
        // payload.sub = Supabase user UUID (same as public.users.id after trigger sync)
        // payload.email = user email
        // payload.role = 'authenticated'
        try {
            const user = await this.authService.validateUser(payload.sub);
            if (user) return user;
        } catch (err) {
            // User not yet in public.users (trigger hasn't run, or backfill pending).
            // Fall through to return minimal payload so the request isn't rejected.
            this.logger.warn(`User ${payload.sub} not found in public.users — using JWT payload. Run supabase_setup.sql to backfill.`);
        }

        // Minimal user object from verified JWT payload — JWT signature is already validated.
        if (!payload.sub) throw new UnauthorizedException();
        return { id: payload.sub, email: payload.email };
    }
}
