import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Body, Controller, Get, Post, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MicrobiologyService } from './microbiology.service';
import { CreateMicrobiologyDataDto } from './dto/create-microbiology-data.dto';
import { UpdateMicrobiologyDataDto } from './dto/update-microbiology-data.dto';

@Controller('microbiology-data')
export class MicrobiologyController {
    constructor(private readonly microbiologyService: MicrobiologyService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Crop', 'cropId', 'pond.farm.userId')
    create(@Body() dto: CreateMicrobiologyDataDto, @CurrentUser() user) {
        return this.microbiologyService.create(dto);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.microbiologyService.findByCrop(cropId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('MicrobiologyData', 'id', 'crop.pond.farm.userId')
    findOne(@Param('id') id: string) {
        return this.microbiologyService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('MicrobiologyData', 'id', 'crop.pond.farm.userId')
    update(@Param('id') id: string, @Body() dto: UpdateMicrobiologyDataDto) {
        return this.microbiologyService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('MicrobiologyData', 'id', 'crop.pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.microbiologyService.remove(id);
    }
}
