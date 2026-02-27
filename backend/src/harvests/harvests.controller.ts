import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { HarvestsService } from './harvests.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
@Controller('harvests')
export class HarvestsController {
    constructor(private readonly harvestsService: HarvestsService) { }

    @Post()
    create(@Body() createDto: CreateHarvestDto, @CurrentUser() user) {
        return this.harvestsService.create(createDto, user.id);
    }

    @Get()
    findAll(@Query('cropId') cropId: string) {
        return this.harvestsService.findAll(cropId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.harvestsService.findOne(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.harvestsService.remove(id);
    }
}
