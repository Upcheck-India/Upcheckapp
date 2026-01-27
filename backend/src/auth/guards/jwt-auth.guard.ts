import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            const supabase = createClient(
                this.configService.get<string>('SUPABASE_URL') || '',
                this.configService.get<string>('SUPABASE_ANON_KEY') || '',
            );

            const { data, error } = await supabase.auth.getUser(token);

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
