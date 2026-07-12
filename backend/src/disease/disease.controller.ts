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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('disease')
export class DiseaseController {
  constructor(private readonly diseaseService: DiseaseService) {}

  // --- Library Endpoints ---
  // disease_library is global, non-tenant-scoped reference data. Reads are open
  // to any authenticated user; writes are admin-only so a farmer/worker cannot
  // create, seed, overwrite, or delete the shared library every tenant sees.

  @Post('library')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  createDisease(@Body() dto: CreateDiseaseDto) {
    return this.diseaseService.createDisease(dto);
  }

  @Get('library')
  findAllDiseases(@Query('lang') lang?: string) {
    return this.diseaseService.findAllDiseases(lang);
  }

  @Get('library/search')
  searchLibrary(@Query('q') query: string, @Query('lang') lang?: string) {
    return this.diseaseService.searchLibrary(query, lang);
  }

  // POST, not GET: this mutates (seeds rows), so it must not be a GET.
  @Post('library/seed')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  seedDiseases() {
    return this.diseaseService.seedDiseases();
  }

  @Get('library/:id')
  findDiseaseById(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.diseaseService.findDiseaseById(id, lang);
  }

  @Put('library/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  updateLibrary(@Param('id') id: string, @Body() dto: UpdateDiseaseLibraryDto) {
    return this.diseaseService.updateLibrary(id, dto);
  }

  @Delete('library/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
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
  @OwnsResource(
    'DiseaseRecord',
    'id',
    'crop.pond.farm.userId',
    'WRITE_MANAGEMENT',
  )
  updateRecord(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDiseaseRecordDto>,
    @CurrentUser() user,
  ) {
    return this.diseaseService.updateRecord(id, dto, user.id);
  }

  @Delete('record/:id')
  @UseGuards(OwnershipGuard)
  @OwnsResource(
    'DiseaseRecord',
    'id',
    'crop.pond.farm.userId',
    'WRITE_MANAGEMENT',
  )
  removeRecord(@Param('id') id: string) {
    return this.diseaseService.removeRecord(id);
  }
}
