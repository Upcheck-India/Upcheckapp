import { Global, Module } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';
import { PhotoDeletionService } from './photo-deletion.service';
import { PhotosAdminController } from './photos-admin.controller';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { PhotoLedgerService } from './photo-ledger.service';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';

@Global()
@Module({
  controllers: [PhotosAdminController, PhotosController],
  providers: [R2StorageService, PhotoDeletionService, PhotoLedgerService, PhotosService, AdminKeyGuard],
  exports: [R2StorageService, PhotoDeletionService, PhotoLedgerService],
})
export class StorageModule {}
