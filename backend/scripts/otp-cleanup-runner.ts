import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OtpCleanupService } from '../src/auth/otp-cleanup.service';

async function runCleanup() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const cleanup = app.get(OtpCleanupService);
  await cleanup.cleanupExpiredOtps();
  await app.close();
}

runCleanup().catch((err) => {
  console.error('OTP cleanup failed:', err);
  process.exit(1);
});
