import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { WaterQualityService } from './water-quality.service';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';

@Controller('water-quality')
export class WaterQualityController {
    constructor(private readonly waterQualityService: WaterQualityService) { }

    @Post()
    create(@Body() createDto: CreateWaterQualityRecordDto) {
        return this.waterQualityService.create(createDto);
    }

    @Get()
    findAll(@Query('pondId') pondId?: string) {
        return this.waterQualityService.findAll(pondId);
    }

    @Get('pond/:pondId/latest')
    getLatest(@Param('pondId') pondId: string) {
        return this.waterQualityService.getLatestByPond(pondId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.waterQualityService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateWaterQualityRecordDto) {
        return this.waterQualityService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.waterQualityService.remove(id);
    }
}
