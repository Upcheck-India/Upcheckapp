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
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';
import { PhotoTermsAckService } from './photo-terms-ack.service';

// F5/F6: HealthPhotoStorageService is generic despite its name/location (any
// farm-scoped record's photos, not just health) — registered here too, on the
// Global module, so every feature module can inject it without importing
// HealthObservationsModule. See health-photo-storage.service.ts.
// FarmAccessModule is itself @Global(), so FarmAccessService (used below by
// PhotosController's generic upload routes) is already available.
@Global()
@Module({
  controllers: [PhotosAdminController, PhotosController, PhotoQuotaAdminController],
  providers: [
    R2StorageService,
    PhotoDeletionService,
    PhotoLedgerService,
    PhotosService,
    AdminKeyGuard,
    R2AnalyticsService,
    HealthPhotoStorageService,
    PhotoTermsAckService,
  ],
  exports: [
    R2StorageService,
    PhotoDeletionService,
    PhotoLedgerService,
    R2AnalyticsService,
    HealthPhotoStorageService,
    PhotoTermsAckService,
  ],
})
export class StorageModule {}
