import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { HarvestsService } from './harvests.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('harvests')
@UseGuards(JwtAuthGuard)
export class HarvestsController {
    constructor(private readonly harvestsService: HarvestsService) { }

    @Post()
    create(@Body() createDto: CreateHarvestDto, @Req() req) {
        return this.harvestsService.create(createDto, req.user.id);
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
