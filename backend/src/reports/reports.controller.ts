import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { ReportsService } from './reports.service';
import { InputRecordService } from './input-record.service';
import { FinancialReportQueryDto } from '../transactions/dto/money-query.dto';
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboardSummary(
    @CurrentUser() user,
    @Query('farmId') farmId?: string,
  ) {
    return this.reportsService.getDashboardSummary(user.id, farmId);
  }

  @Get('cycle/:id/analysis')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'id', 'pond.farm.userId', 'VIEW_FINANCIALS')
  async getCycleAnalysis(@CurrentUser() user, @Param('id') id: string) {
    return this.reportsService.getCycleAnalysis(id, user.id);
  }

  @Get('financials')
  async getFinancialReport(
    @Query() q: FinancialReportQueryDto,
    @CurrentUser() user,
  ) {
    return this.reportsService.getFinancialReport(
      q.farmId as string,
      user.id,
      q,
    );
  }
}

/**
 * Cycle Result (harvest-and-molt H3). READ: every member of the pond sees the
 * season's kg, FCR and welfare; the `money` block is null without
 * VIEW_FINANCIALS (the service asks `getCycleFinancials`, which enforces it).
 */
@Controller('crops')
export class CycleResultController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':id/result')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'id', 'pond.farm.userId', 'READ')
  getResult(@CurrentUser() user, @Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.getCycleResult(id, user.id);
  }
}

/**
 * Cycle input record (disease spec D4). READ at the guard; the service then
 * refuses anyone but the owner or a manager, because the document is shared
 * outside the farm. No money in it, so no VIEW_FINANCIALS.
 */
@Controller('crops')
export class InputRecordController {
  constructor(private readonly inputRecord: InputRecordService) {}

  @Get(':id/input-record')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'id', 'pond.farm.userId', 'READ')
  get(@CurrentUser() user, @Param('id', ParseUUIDPipe) id: string) {
    return this.inputRecord.forCrop(id, user.id);
  }
}
