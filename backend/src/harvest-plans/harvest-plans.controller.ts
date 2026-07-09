import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HarvestPlansService } from './harvest-plans.service';
import { CreateHarvestPlanDto } from './dto/create-harvest-plan.dto';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';
import { CompletePlanDto } from './dto/complete-plan.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';

@Controller('harvest-plans')
export class HarvestPlansController {
  constructor(private readonly harvestPlansService: HarvestPlansService) {}

  @Post()
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'WRITE_MANAGEMENT')
  create(@Body() createDto: CreateHarvestPlanDto) {
    return this.harvestPlansService.create(createDto);
  }

  @Get()
  findAll(@CurrentUser() user, @Query('pondId') pondId?: string) {
    return this.harvestPlansService.findAll(user.id, pondId);
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('HarvestPlan', 'id', 'pond.farm.userId', 'READ')
  findOne(@Param('id') id: string) {
    return this.harvestPlansService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('HarvestPlan', 'id', 'pond.farm.userId', 'WRITE_MANAGEMENT')
  update(@Param('id') id: string, @Body() updateDto: UpdateHarvestPlanDto) {
    return this.harvestPlansService.update(id, updateDto);
  }

  @Patch(':id/complete')
  @UseGuards(OwnershipGuard)
  @OwnsResource('HarvestPlan', 'id', 'pond.farm.userId', 'WRITE_MANAGEMENT')
  complete(@Param('id') id: string, @Body() payload: CompletePlanDto) {
    return this.harvestPlansService.completePlan(id, payload);
  }

  @Get('pond/:pondId/summary')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Farm', 'farmId', 'userId', 'VIEW_FINANCIALS')
  getSummary(@Param('pondId') pondId: string, @Query('farmId') farmId: string) {
    return this.harvestPlansService.getCycleSummary(pondId, farmId);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('HarvestPlan', 'id', 'pond.farm.userId', 'WRITE_MANAGEMENT')
  remove(@Param('id') id: string) {
    return this.harvestPlansService.remove(id);
  }
}
