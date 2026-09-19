import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../email.service';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthController } from './supabase-auth.controller';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { TruecallerService } from './truecaller.service';
import { TwoFactorService } from './two-factor.service';
import { User } from './user.entity';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [SupabaseAuthController, AccountController],
  providers: [
    EmailService,
    SupabaseAuthService,
    AccountService,
    SupabaseAuthGuard,
    TruecallerService,
    TwoFactorService,
    // NOTE: JwtAuthGuard is registered ONCE globally in app.module.ts. It was
    // previously ALSO registered here — because APP_GUARD is a multi-provider
    // token, both ran on every request, doubling the Supabase getUser() call.
  ],
  exports: [SupabaseAuthService, AccountService],
})
export class AuthModule {}
