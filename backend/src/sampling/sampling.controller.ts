import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { CreateSamplingDto } from './dto/create-sampling.dto';
import { UpdateSamplingDto } from './dto/update-sampling.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sampling')
@UseGuards(JwtAuthGuard)
export class SamplingController {
    constructor(private readonly samplingService: SamplingService) { }

    @Post()
    create(@Body() createDto: CreateSamplingDto) {
        return this.samplingService.create(createDto);
    }

    @Get()
    findAll(@Query('cropId') cropId?: string) {
        return this.samplingService.findAll(cropId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.samplingService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateSamplingDto) {
        return this.samplingService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.samplingService.remove(id);
    }
}
