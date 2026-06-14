import { Controller, Post, Body } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CaptureService } from './capture.service';

interface SamplingBody {
  pondId: string;
  cropId?: string;
  weights: number[];
  measuredAt?: string;
}
interface ClinicalSignsBody {
  pondId: string;
  cropId?: string;
  signs: Record<string, boolean | string>;
  measuredAt?: string;
}
interface WaterExchangeBody {
  pondId: string;
  cropId?: string;
  pct?: number;
  volumeM3?: number;
  source?: string;
  measuredAt?: string;
}

/**
 * Capture flows that write through the Measurement pipeline
 * (data_collection_audit.md §2): sampling CV, clinical-signs checklist,
 * water-exchange events.
 */
@Controller('capture')
export class CaptureController {
  constructor(private readonly service: CaptureService) {}

  @Post('sampling')
  sampling(@Body() body: SamplingBody, @CurrentUser() user) {
    return this.service.recordSampling(
      body.pondId,
      body.cropId,
      body.weights ?? [],
      user.id,
      body.measuredAt,
    );
  }

  @Post('clinical-signs')
  clinicalSigns(@Body() body: ClinicalSignsBody, @CurrentUser() user) {
    return this.service.recordClinicalSigns(
      body.pondId,
      body.cropId,
      body.signs ?? {},
      user.id,
      body.measuredAt,
    );
  }

  @Post('water-exchange')
  waterExchange(@Body() body: WaterExchangeBody, @CurrentUser() user) {
    return this.service.recordWaterExchange(
      body.pondId,
      body.cropId,
      { pct: body.pct, volumeM3: body.volumeM3, source: body.source },
      user.id,
      body.measuredAt,
    );
  }
}
