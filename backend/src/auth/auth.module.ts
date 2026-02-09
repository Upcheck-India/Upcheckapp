import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OtpCode } from './otp-code.entity';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { OtpCleanupService } from './otp-cleanup.service';
import { MailService } from './mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([OtpCode]), ScheduleModule.forRoot()],
  providers: [AuthService, JwtAuthGuard, OtpRateLimitService, OtpCleanupService, MailService],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule { }
