import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { CropsService } from './crops.service';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('crops')
@UseGuards(JwtAuthGuard)
export class CropsController {
    constructor(private readonly cropsService: CropsService) { }

    @Post()
    create(@Body() createCropDto: CreateCropDto, @Request() req) {
        return this.cropsService.create(createCropDto, req.user.id);
    }

    @Get()
    findAll(@Query('pondId') pondId: string, @Request() req) {
        if (!pondId) {
            throw new BadRequestException('pondId query parameter is required');
        }
        return this.cropsService.findAll(pondId, req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.cropsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCropDto: UpdateCropDto, @Request() req) {
        return this.cropsService.update(id, updateCropDto, req.user.id);
    }

    @Patch(':id/harvest')
    harvest(
        @Param('id') id: string,
        @Body() harvestData: { actualHarvestDate: Date; harvestWeightKg: number },
        @Request() req
    ) {
        return this.cropsService.harvest(id, harvestData, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.cropsService.remove(id, req.user.id);
    }
}
