import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthObservation } from './health-observation.entity';
import { HealthObservationsService } from './health-observations.service';
import { HealthObservationsController } from './health-observations.controller';
import { HealthPhotoStorageService } from './health-photo-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([HealthObservation])],
  controllers: [HealthObservationsController],
  providers: [HealthObservationsService, HealthPhotoStorageService],
  exports: [HealthPhotoStorageService],
})
export class HealthObservationsModule {}
