import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DiseaseService } from './disease.service';
import {
  CreateDiseaseDto,
  CreateDiseaseRecordDto,
} from './dto/create-disease.dto';
import { UpdateDiseaseLibraryDto } from './dto/update-disease-library.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';

@Controller('disease')
export class DiseaseController {
  constructor(private readonly diseaseService: DiseaseService) {}

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

  // POST, not GET: this mutates (seeds rows), so it must not be a GET.
  @Post('library/seed')
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
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'cropId', 'pond.farm.userId')
  recordOccurrence(@Body() dto: CreateDiseaseRecordDto, @CurrentUser() user) {
    return this.diseaseService.recordOccurrence(dto, user.id);
  }

  @Get('record/crop/:cropId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'cropId', 'pond.farm.userId', 'READ')
  findRecordsByCrop(@Param('cropId') cropId: string) {
    return this.diseaseService.findRecordsByCrop(cropId);
  }

  @Patch('record/:id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('DiseaseRecord', 'id', 'crop.pond.farm.userId', 'WRITE_MANAGEMENT')
  updateRecord(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDiseaseRecordDto>,
    @CurrentUser() user,
  ) {
    return this.diseaseService.updateRecord(id, dto, user.id);
  }

  @Delete('record/:id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('DiseaseRecord', 'id', 'crop.pond.farm.userId', 'WRITE_MANAGEMENT')
  removeRecord(@Param('id') id: string) {
    return this.diseaseService.removeRecord(id);
  }
}
