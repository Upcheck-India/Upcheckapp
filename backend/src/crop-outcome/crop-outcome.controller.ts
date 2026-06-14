import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CropOutcomeService } from './crop-outcome.service';
import type { OutcomeInputs } from './crop-outcome.service';

interface FreezeBody {
  cropId: string;
  inputs: OutcomeInputs;
}

/** Frozen CropOutcome label record (data_collection_audit.md §5). */
@Controller('crop-outcome')
export class CropOutcomeController {
  constructor(private readonly service: CropOutcomeService) {}

  /** Pure preview of the derived label record (not persisted). */
  @Post('preview')
  preview(@Body() inputs: OutcomeInputs) {
    return this.service.deriveOutcome(inputs);
  }

  /** Freeze the label record for a crop (immutable). */
  @Post('freeze')
  freeze(@Body() body: FreezeBody, @CurrentUser() user) {
    return this.service.freeze(body.cropId, user.id, body.inputs);
  }

  @Get('crop/:cropId')
  get(@Param('cropId') cropId: string, @CurrentUser() user) {
    return this.service.get(cropId, user.id);
  }
}
