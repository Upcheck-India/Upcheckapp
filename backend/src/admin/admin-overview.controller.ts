import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { AdminOverviewService } from './admin-overview.service';

/** Staff-only (AdminKeyGuard, see its docs): the dashboard home page. */
@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get()
  get() {
    return this.overview.get();
  }
}
