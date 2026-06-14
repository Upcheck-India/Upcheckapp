import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

@Controller('treatments')
export class TreatmentsController {
    constructor(private readonly treatmentsService: TreatmentsService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Crop', 'cropId', 'pond.farm.userId')
    create(@Body() createDto: CreateTreatmentDto, @CurrentUser() user) {
        return this.treatmentsService.create(createDto, user.id);
    }

    @Get()
    findAll(@Query('cropId') cropId?: string) {
        return this.treatmentsService.findAll(cropId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Treatment', 'id', 'crop.pond.farm.userId')
    findOne(@Param('id') id: string) {
        return this.treatmentsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Treatment', 'id', 'crop.pond.farm.userId')
    update(@Param('id') id: string, @Body() updateDto: UpdateTreatmentDto, @CurrentUser() user) {
        return this.treatmentsService.update(id, updateDto, user.id);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Treatment', 'id', 'crop.pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.treatmentsService.remove(id);
    }
}
