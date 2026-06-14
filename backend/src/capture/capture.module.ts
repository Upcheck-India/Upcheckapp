import { Module } from '@nestjs/common';
import { CaptureService } from './capture.service';
import { CaptureController } from './capture.controller';
import { MeasurementModule } from '../measurement/measurement.module';

/**
 * Higher-level capture flows (clinical-signs, water-exchange, sampling CV) that
 * write through the Measurement pipeline (data_collection_audit.md §2).
 */
@Module({
  imports: [MeasurementModule],
  controllers: [CaptureController],
  providers: [CaptureService],
  exports: [CaptureService],
})
export class CaptureModule {}
