import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private supabase: ReturnType<typeof createClient>;

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>('SUPABASE_URL') || '',
            this.configService.get<string>('SUPABASE_ANON_KEY') || '',
        );
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            const { data, error } = await this.supabase.auth.getUser(token);

            if (error || !data.user) {
                throw new UnauthorizedException('Invalid token');
            }

            request.user = data.user;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
