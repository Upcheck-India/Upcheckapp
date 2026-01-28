import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HarvestPlansService } from './harvest-plans.service';
import { CreateHarvestPlanDto } from './dto/create-harvest-plan.dto';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';

@Controller('harvest-plans')
export class HarvestPlansController {
    constructor(private readonly harvestPlansService: HarvestPlansService) { }

    @Post()
    create(@Body() createDto: CreateHarvestPlanDto) {
        return this.harvestPlansService.create(createDto);
    }

    @Get()
    findAll(@Query('pondId') pondId?: string) {
        return this.harvestPlansService.findAll(pondId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.harvestPlansService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateHarvestPlanDto) {
        return this.harvestPlansService.update(id, updateDto);
    }

    @Patch(':id/complete')
    complete(@Param('id') id: string, @Body() payload: {
        actualHarvestDate: Date;
        actualWeightKg: number;
        actualPricePerKg: number;
        farmId: string;
        cropId?: string;
    }) {
        return this.harvestPlansService.completePlan(id, payload);
    }

    @Get('pond/:pondId/summary')
    getSummary(@Param('pondId') pondId: string, @Query('farmId') farmId: string) {
        return this.harvestPlansService.getCycleSummary(pondId, farmId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.harvestPlansService.remove(id);
    }
}
