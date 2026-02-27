import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DiseaseService } from './disease.service';
import { CreateDiseaseDto, CreateDiseaseRecordDto } from './dto/create-disease.dto';

@Controller('disease')
export class DiseaseController {
    constructor(private readonly diseaseService: DiseaseService) { }

    // --- Library Endpoints ---

    @Post('library')
    createDisease(@Body() dto: CreateDiseaseDto) {
        return this.diseaseService.createDisease(dto);
    }

    @Get('library')
    findAllDiseases() {
        return this.diseaseService.findAllDiseases();
    }

    @Get('library/:id')
    findDiseaseById(@Param('id') id: string) {
        return this.diseaseService.findDiseaseById(id);
    }

    // --- Record Endpoints ---

    @Post('record')
    recordOccurrence(@Body() dto: CreateDiseaseRecordDto) {
        return this.diseaseService.recordOccurrence(dto);
    }

    @Get('record/crop/:cropId')
    findRecordsByCrop(@Param('cropId') cropId: string) {
        return this.diseaseService.findRecordsByCrop(cropId);
    }
}
