import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Public } from '../auth/decorators/auth.decorators';
import { LunarService, MoltVulnerabilityInput } from './lunar.service';

/** Numbers only (no NaN / strings); ranges are the engine's business. */
export class MoltVulnerabilityDto implements MoltVulnerabilityInput {
  @IsOptional() @IsNumber() do?: number;
  @IsOptional() @IsNumber() temp?: number;
  @IsOptional() @IsNumber() freeNh3?: number;
  @IsOptional() @IsNumber() phSwing?: number;
  @IsOptional() @IsNumber() mineralDeficitFrac?: number;
  @IsOptional() @IsBoolean() diseaseHigh?: boolean;
  @IsOptional() @IsNumber() densityRatio?: number;
  @IsOptional() @IsIn(['empty', 'few_left', 'a_lot_left']) tray?: 'empty' | 'few_left' | 'a_lot_left' | null;
  @IsOptional() @IsNumber() salinity?: number;
}

/** M1.7: without a DTO a missing abwG produced a NaN score. */
export class ComputeRiskDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsNumber()
  @Min(0)
  @Max(200)
  abwG: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoltVulnerabilityDto)
  vulnerability?: MoltVulnerabilityDto;
}

/**
 * Lunar molt module (lunar_module_spec.md). Pure computation — moon phase is
 * deterministic, so these need no persistence. `phase` is public (a calendar
 * helper); `risk` personalizes by pond data.
 */
@Controller('lunar')
export class LunarController {
  constructor(private readonly service: LunarService) {}

  /** Moon phase + semi-lunar molt likelihood for a date (default today). */
  @Public()
  @Get('phase')
  phase(@Query('date') date?: string) {
    const d = date ? new Date(date) : new Date();
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException('invalid date');
    return this.service.moonPhase(d);
  }

  /** Molt Risk Score for a pond, given its latest data. */
  @Post('risk')
  risk(@Body() body: ComputeRiskDto) {
    const d = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException('invalid date');
    const phase = this.service.moonPhase(d);
    const vulnerability = body.vulnerability ?? {};
    const risk = this.service.computeMoltRisk(phase, body.abwG, vulnerability);
    const playbook = this.service.buildPlaybook(phase, risk, vulnerability);
    return { phase, risk, playbook };
  }
}
