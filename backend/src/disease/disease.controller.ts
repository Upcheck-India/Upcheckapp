import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DiseaseService } from './disease.service';
import { CreateDiseaseDto, CreateDiseaseRecordDto } from './dto/create-disease.dto';
import { UpdateDiseaseLibraryDto } from './dto/update-disease-library.dto';

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

    @Get('library/search')
    searchLibrary(@Query('q') query: string) {
        return this.diseaseService.searchLibrary(query);
    }

    @Get('library/seed')
    seedDiseases() {
        return this.diseaseService.seedDiseases();
    }

    @Get('library/:id')
    findDiseaseById(@Param('id') id: string) {
        return this.diseaseService.findDiseaseById(id);
    }

    @Put('library/:id')
    updateLibrary(@Param('id') id: string, @Body() dto: UpdateDiseaseLibraryDto) {
        return this.diseaseService.updateLibrary(id, dto);
    }

    @Delete('library/:id')
    removeLibrary(@Param('id') id: string) {
        return this.diseaseService.removeLibrary(id);
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
