import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailService } from '../email.service';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthController } from './supabase-auth.controller';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { TruecallerService } from './truecaller.service';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [SupabaseAuthController],
  providers: [
    EmailService,
    SupabaseAuthService,
    SupabaseAuthGuard,
    TruecallerService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [SupabaseAuthService],
})
export class AuthModule { }
