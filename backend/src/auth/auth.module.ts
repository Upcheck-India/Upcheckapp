import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailService } from '../email.service';
import { User } from './user.entity';
import { OtpCode } from './otp-code.entity';
import { RefreshToken } from './refresh-token.entity';
import { LoginHistory } from './login-history.entity';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthController } from './supabase-auth.controller';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OtpCode, RefreshToken, LoginHistory]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),
  ],
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
  exports: [PassportModule, SupabaseAuthService],
})
export class AuthModule { }
