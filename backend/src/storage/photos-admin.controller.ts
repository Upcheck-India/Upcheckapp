import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { PhotoDeletionService } from './photo-deletion.service';

/** Staff-only (AdminKeyGuard, see its docs): the F1 deletion queue. */
@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/photos')
export class PhotosAdminController {
  constructor(private readonly deletions: PhotoDeletionService) {}

  /** Big sweep: also retries rows automatic draining gave up on. */
  @Post('drain')
  drain() {
    return this.deletions.drain(1000, { includeFailed: true });
  }

  @Get('deletions/failed')
  failed() {
    return this.deletions.failures();
  }
}
