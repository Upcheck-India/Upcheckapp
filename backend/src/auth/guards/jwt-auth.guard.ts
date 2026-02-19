import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const req = context.switchToHttp().getRequest();
        const method = req.method;
        const url = req.url;
        const authHeader: string | undefined = req.headers?.authorization;

        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            this.logger.log(`[PUBLIC] ${method} ${url} — skipping auth`);
            return true;
        }

        if (!authHeader) {
            this.logger.warn(`[NO AUTH HEADER] ${method} ${url} — request has no Authorization header`);
        } else {
            const tokenPreview = authHeader.startsWith('Bearer ')
                ? authHeader.substring(7, 27) + '...'
                : '(not a Bearer token)';
            this.logger.log(`[GUARD] ${method} ${url} — Authorization header present, token starts: ${tokenPreview}`);
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const method = req.method;
        const url = req.url;

        if (err || !user) {
            this.logger.error(
                `[UNAUTHORIZED] ${method} ${url} — err: ${err?.message ?? 'none'} | info: ${info?.message ?? info ?? 'none'} | user: ${user ? JSON.stringify(user) : 'null'}`,
            );
            throw err || new UnauthorizedException(info?.message || 'Invalid or missing token');
        }

        this.logger.log(`[AUTH OK] ${method} ${url} — user.id: ${user.id} | user.email: ${user.email}`);
        return user;
    }
}
