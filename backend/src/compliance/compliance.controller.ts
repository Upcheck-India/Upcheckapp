import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { ComplianceService } from './compliance.service';

/**
 * Cycle antimicrobial status (D3.4). READ, not VIEW_FINANCIALS: the names of
 * logged substances are safety, not money, so every role sees them.
 */
@Controller('crops')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get(':id/compliance')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'id', 'pond.farm.userId', 'READ')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.compliance.cycleCompliance(id);
  }
}
