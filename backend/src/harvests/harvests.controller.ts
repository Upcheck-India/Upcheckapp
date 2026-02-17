import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { HarvestsService } from './harvests.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('harvests')
@UseGuards(JwtAuthGuard)
export class HarvestsController {
    constructor(private readonly harvestsService: HarvestsService) { }

    @Post()
    create(@Body() createDto: CreateHarvestDto) {
        return this.harvestsService.create(createDto);
    }

    @Get()
    findAll(@Query('cropId') cropId?: string) {
        return this.harvestsService.findAll(cropId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.harvestsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateHarvestDto) {
        return this.harvestsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.harvestsService.remove(id);
    }
}
