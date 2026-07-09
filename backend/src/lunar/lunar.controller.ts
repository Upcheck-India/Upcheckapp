import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import { LunarService, MoltVulnerabilityInput } from './lunar.service';

interface ComputeRiskBody {
  date?: string;
  abwG: number;
  vulnerability?: MoltVulnerabilityInput;
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
  risk(@Body() body: ComputeRiskBody) {
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
