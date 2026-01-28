import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { WaterQualityService } from './water-quality.service';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('water-quality')
@UseGuards(JwtAuthGuard)
export class WaterQualityController {
    constructor(private readonly waterQualityService: WaterQualityService) { }

    @Post()
    create(@Body() createDto: CreateWaterQualityRecordDto, @Request() req) {
        return this.waterQualityService.create(createDto, req.user.id);
    }

    @Get()
    findAll(@Query('pondId') pondId: string, @Request() req) {
        if (!pondId) {
            throw new BadRequestException('pondId query parameter is required');
        }
        return this.waterQualityService.findAll(pondId, req.user.id);
    }

    @Get('pond/:pondId/latest')
    getLatest(@Param('pondId') pondId: string, @Request() req) {
        return this.waterQualityService.getLatestByPond(pondId, req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.waterQualityService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateWaterQualityRecordDto, @Request() req) {
        return this.waterQualityService.update(id, updateDto, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.waterQualityService.remove(id, req.user.id);
    }
}
