import { Global, Module } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';
import { PhotoDeletionService } from './photo-deletion.service';
import { PhotosAdminController } from './photos-admin.controller';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { PhotoLedgerService } from './photo-ledger.service';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';
import { PhotoQuotaAdminController } from './photo-quota-admin.controller';
import { R2AnalyticsService } from './r2-analytics.service';

@Global()
@Module({
  controllers: [PhotosAdminController, PhotosController, PhotoQuotaAdminController],
  providers: [R2StorageService, PhotoDeletionService, PhotoLedgerService, PhotosService, AdminKeyGuard, R2AnalyticsService],
  exports: [R2StorageService, PhotoDeletionService, PhotoLedgerService, R2AnalyticsService],
})
export class StorageModule {}
