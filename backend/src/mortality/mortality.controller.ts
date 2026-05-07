import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Body, Controller, Get, Post, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MortalityService } from './mortality.service';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';
import { UpdateMortalityRecordDto } from './dto/update-mortality-record.dto';

@Controller('mortality')
export class MortalityController {
    constructor(private readonly mortalityService: MortalityService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Crop', 'cropId', 'pond.farm.userId')
    create(@Body() dto: CreateMortalityRecordDto, @CurrentUser() user) {
        return this.mortalityService.create(dto);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.mortalityService.findByCrop(cropId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('MortalityRecord', 'id', 'crop.pond.farm.userId')
    findOne(@Param('id') id: string) {
        return this.mortalityService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('MortalityRecord', 'id', 'crop.pond.farm.userId')
    update(@Param('id') id: string, @Body() dto: UpdateMortalityRecordDto) {
        return this.mortalityService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('MortalityRecord', 'id', 'crop.pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.mortalityService.remove(id);
    }
}
