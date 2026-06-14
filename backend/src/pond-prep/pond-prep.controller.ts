import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PondPrepService } from './pond-prep.service';
import type { FarmType } from './pond-prep.service';

interface LimeDoseBody {
  soilPhTarget: number;
  soilPhNow: number;
  areaM2: number;
  bufferFactor?: number;
}
interface ReadinessBody {
  farmType: FarmType;
  completedKeys: string[];
}

/** Pre-Stocking Pond-Prep SOP (farmer_features_spec.md §7). */
@Controller('pond-prep')
export class PondPrepController {
  constructor(private readonly service: PondPrepService) {}

  @Get('template')
  template(@Query('farmType') farmType: FarmType) {
    return this.service.template(farmType ?? 'coastal_brackish');
  }

  @Post('lime-dose')
  limeDose(@Body() body: LimeDoseBody) {
    return {
      limeKg: this.service.limeDoseKg(
        body.soilPhTarget,
        body.soilPhNow,
        body.areaM2,
        body.bufferFactor,
      ),
    };
  }

  @Post('readiness')
  readiness(@Body() body: ReadinessBody) {
    return this.service.readiness(body.farmType, body.completedKeys ?? []);
  }
}
