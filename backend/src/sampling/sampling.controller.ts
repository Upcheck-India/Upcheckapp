import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { CreateSamplingDto } from './dto/create-sampling.dto';
import { UpdateSamplingDto } from './dto/update-sampling.dto';

@Controller('sampling')
export class SamplingController {
    constructor(private readonly samplingService: SamplingService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'pondId', 'farm.userId')
    create(@Body() createDto: CreateSamplingDto, @CurrentUser() user) {
        return this.samplingService.create(createDto, user.id);
    }

    @Get()
    findAll(@Query('cropId') cropId?: string) {
        return this.samplingService.findAll(cropId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('SamplingData', 'id', 'pond.farm.userId')
    findOne(@Param('id') id: string) {
        return this.samplingService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('SamplingData', 'id', 'pond.farm.userId')
    update(@Param('id') id: string, @Body() updateDto: UpdateSamplingDto, @CurrentUser() user) {
        return this.samplingService.update(id, updateDto, user.id);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('SamplingData', 'id', 'pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.samplingService.remove(id);
    }
}
