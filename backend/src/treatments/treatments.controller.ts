import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('treatments')
@UseGuards(JwtAuthGuard)
export class TreatmentsController {
    constructor(private readonly treatmentsService: TreatmentsService) { }

    @Post()
    create(@Body() createDto: CreateTreatmentDto) {
        return this.treatmentsService.create(createDto);
    }

    @Get()
    findAll(@Query('cropId') cropId?: string) {
        return this.treatmentsService.findAll(cropId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.treatmentsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateTreatmentDto) {
        return this.treatmentsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.treatmentsService.remove(id);
    }
}
