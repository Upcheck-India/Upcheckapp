import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailService } from '../email.service';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthController } from './supabase-auth.controller';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';

@Module({
  imports: [],
  controllers: [SupabaseAuthController],
  providers: [
    EmailService,
    SupabaseAuthService,
    SupabaseAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [SupabaseAuthService],
})
export class AuthModule { }
