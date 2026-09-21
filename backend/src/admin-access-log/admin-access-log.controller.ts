import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { AdminAccessLogService } from './admin-access-log.service';

/**
 * C5.1: "surface it, so the log is looked at rather than merely kept."
 * Same shared-secret-turned-per-staff story as the other admin controllers —
 * see admin-key.guard.ts.
 */
@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/access-log')
export class AdminAccessLogController {
  constructor(private readonly accessLog: AdminAccessLogService) {}

  @Get()
  list(@Query('limit') limit?: string, @Query('before') before?: string) {
    return this.accessLog.list(limit ? Number(limit) : undefined, before);
  }
}
