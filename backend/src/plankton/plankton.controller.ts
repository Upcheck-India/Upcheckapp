import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Body, Controller, Get, Post, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PlanktonService } from './plankton.service';
import { CreatePlanktonDataDto } from './dto/create-plankton-data.dto';
import { UpdatePlanktonDataDto } from './dto/update-plankton-data.dto';

@Controller('plankton-data')
export class PlanktonController {
    constructor(private readonly planktonService: PlanktonService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Crop', 'cropId', 'pond.farm.userId')
    create(@Body() dto: CreatePlanktonDataDto, @CurrentUser() user) {
        return this.planktonService.create(dto);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.planktonService.findByCrop(cropId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('PlanktonData', 'id', 'crop.pond.farm.userId')
    findOne(@Param('id') id: string) {
        return this.planktonService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('PlanktonData', 'id', 'crop.pond.farm.userId')
    update(@Param('id') id: string, @Body() dto: UpdatePlanktonDataDto) {
        return this.planktonService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('PlanktonData', 'id', 'crop.pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.planktonService.remove(id);
    }
}
