import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { AdminAccessLogController } from './admin-access-log.controller';
import { AdminAccessLogInterceptor } from './admin-access-log.interceptor';
import { AdminAccessLogService } from './admin-access-log.service';

/**
 * Registers AdminAccessLogInterceptor as APP_INTERCEPTOR here (not in
 * AppModule) — Nest applies an APP_INTERCEPTOR globally regardless of which
 * imported module provides it, so this keeps the whole C5.1 feature in one
 * module instead of scattering providers into app.module.ts.
 */
@Module({
  controllers: [AdminAccessLogController],
  providers: [
    AdminAccessLogService,
    AdminKeyGuard,
    { provide: APP_INTERCEPTOR, useClass: AdminAccessLogInterceptor },
  ],
  exports: [AdminAccessLogService],
})
export class AdminAccessLogModule {}
