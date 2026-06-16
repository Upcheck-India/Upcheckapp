import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Body, Controller, Get, Post, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChemicalService } from './chemical.service';
import { CreateChemicalDataDto } from './dto/create-chemical-data.dto';
import { UpdateChemicalDataDto } from './dto/update-chemical-data.dto';

@Controller('chemical-data')
export class ChemicalController {
    constructor(private readonly chemicalService: ChemicalService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Crop', 'cropId', 'pond.farm.userId')
    create(@Body() dto: CreateChemicalDataDto, @CurrentUser() user) {
        return this.chemicalService.create(dto, user.id);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.chemicalService.findByCrop(cropId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('ChemicalData', 'id', 'crop.pond.farm.userId', 'READ')
    findOne(@Param('id') id: string) {
        return this.chemicalService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('ChemicalData', 'id', 'crop.pond.farm.userId')
    update(@Param('id') id: string, @Body() dto: UpdateChemicalDataDto, @CurrentUser() user) {
        return this.chemicalService.update(id, dto, user.id);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('ChemicalData', 'id', 'crop.pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.chemicalService.remove(id);
    }
}
