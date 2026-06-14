import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropOutcome } from './crop-outcome.entity';
import { CropOutcomeService } from './crop-outcome.service';
import { CropOutcomeController } from './crop-outcome.controller';
import { IndiaModule } from '../india/india.module';

/** Frozen CropOutcome ML-label record (data_collection_audit.md §5). */
@Module({
  imports: [TypeOrmModule.forFeature([CropOutcome]), IndiaModule],
  controllers: [CropOutcomeController],
  providers: [CropOutcomeService],
  exports: [CropOutcomeService],
})
export class CropOutcomeModule {}
