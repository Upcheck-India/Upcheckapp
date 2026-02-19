import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthService } from '../supabase-auth.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
    constructor(private supabaseAuthService: SupabaseAuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
            const user = await this.supabaseAuthService.verifyAccessToken(token);
            request.user = user; // Attach user to request
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
