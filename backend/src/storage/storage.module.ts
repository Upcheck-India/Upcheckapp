import { Global, Module } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';
import { PhotoDeletionService } from './photo-deletion.service';
import { PhotosAdminController } from './photos-admin.controller';
import { AdminKeyGuard } from '../feedback/admin-key.guard';

@Global()
@Module({
  controllers: [PhotosAdminController],
  providers: [R2StorageService, PhotoDeletionService, AdminKeyGuard],
  exports: [R2StorageService, PhotoDeletionService],
})
export class StorageModule {}
