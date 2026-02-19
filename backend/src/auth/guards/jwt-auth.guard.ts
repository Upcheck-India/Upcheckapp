import { Injectable, ExecutionContext, Logger, UnauthorizedException, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthService } from '../supabase-auth.service';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(
        private reflector: Reflector,
        private supabaseAuthService: SupabaseAuthService,
        private authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const method = req.method;
        const url = req.url;

        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            this.logger.log(`[PUBLIC] ${method} ${url} — skipping auth`);
            return true;
        }

        const authHeader: string | undefined = req.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            this.logger.warn(`[NO AUTH HEADER] ${method} ${url} — missing or malformed Authorization header`);
            throw new UnauthorizedException('No bearer token provided');
        }

        const token = authHeader.substring(7);
        this.logger.log(`[GUARD] ${method} ${url} — verifying token via Supabase admin (alg-agnostic)`);

        try {
            // verifyAccessToken calls supabase.auth.getUser(token) on the server side.
            // This works regardless of JWT algorithm (HS256 or ES256).
            const supabaseUser = await this.supabaseAuthService.verifyAccessToken(token);
            this.logger.log(`[GUARD] token valid — sub: ${supabaseUser.id} | email: ${supabaseUser.email}`);

            // Try to load the full user from public.users; fall back to Supabase user object.
            let appUser: any;
            try {
                appUser = await this.authService.validateUser(supabaseUser.id);
            } catch (dbErr: any) {
                this.logger.warn(`[GUARD] DB lookup failed: ${dbErr.message} — using Supabase user as fallback`);
            }

            req.user = appUser ?? { id: supabaseUser.id, email: supabaseUser.email };
            this.logger.log(`[AUTH OK] ${method} ${url} — req.user.id: ${req.user.id}`);
            return true;
        } catch (err: any) {
            this.logger.error(`[UNAUTHORIZED] ${method} ${url} — ${err.message}`);
            throw new UnauthorizedException(err.message || 'Invalid or expired token');
        }
    }
}
