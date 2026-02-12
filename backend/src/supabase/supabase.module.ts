import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'SUPABASE_CLIENT',
            useFactory: (configService: ConfigService) => {
                return createClient(
                    configService.get<string>('SUPABASE_URL') || '',
                    configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '', // Use Service Role for admin tasks
                );
            },
            inject: [ConfigService],
        },
    ],
    exports: ['SUPABASE_CLIENT'],
})
export class SupabaseModule { }
