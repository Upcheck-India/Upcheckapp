import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OtpCode } from './otp-code.entity';
import { User } from './user.entity';
import { Profile } from '../profiles/profile.entity';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { OtpCleanupService } from './otp-cleanup.service';
import { MailService } from './mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpCode, User, Profile]),
    ScheduleModule.forRoot(),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secretKey',
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') || '7d' as any },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OtpRateLimitService, OtpCleanupService, MailService],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule { }
