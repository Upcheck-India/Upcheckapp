import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReferenceService } from './reference.service';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { CreateHatcheryDto } from './dto/create-hatchery.dto';
import { UpdateHatcheryDto } from './dto/update-hatchery.dto';
import { CreateBroodstockDto } from './dto/create-broodstock.dto';
import { UpdateBroodstockDto } from './dto/update-broodstock.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

// species/hatcheries/broodstocks are global, non-tenant reference data. Reads
// are open to any authenticated user; writes are admin-only (mirrors the
// disease-library gating) so a farmer/worker cannot mutate the shared catalog
// every tenant sees. RolesGuard no-ops on the read routes (no @Roles metadata).
@Controller('reference')
@UseGuards(RolesGuard)
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  // ─── Species ──────────────────────────────────────────────

  @Post('species')
  @Roles(Role.SUPER_ADMIN)
  createSpecies(@Body() dto: CreateSpeciesDto) {
    return this.referenceService.createSpecies(dto);
  }

  @Get('species')
  findAllSpecies(@Query('search') search?: string) {
    return this.referenceService.findAllSpecies(search);
  }

  @Get('species/:id')
  findOneSpecies(@Param('id') id: string) {
    return this.referenceService.findOneSpecies(id);
  }

  @Patch('species/:id')
  @Roles(Role.SUPER_ADMIN)
  updateSpecies(@Param('id') id: string, @Body() dto: UpdateSpeciesDto) {
    return this.referenceService.updateSpecies(id, dto);
  }

  @Delete('species/:id')
  @Roles(Role.SUPER_ADMIN)
  removeSpecies(@Param('id') id: string) {
    return this.referenceService.removeSpecies(id);
  }

  // ─── Hatcheries ───────────────────────────────────────────

  @Post('hatcheries')
  @Roles(Role.SUPER_ADMIN)
  createHatchery(@Body() dto: CreateHatcheryDto) {
    return this.referenceService.createHatchery(dto);
  }

  @Get('hatcheries')
  findAllHatcheries(@Query('search') search?: string) {
    return this.referenceService.findAllHatcheries(search);
  }

  @Get('hatcheries/:id')
  findOneHatchery(@Param('id') id: string) {
    return this.referenceService.findOneHatchery(id);
  }

  @Patch('hatcheries/:id')
  @Roles(Role.SUPER_ADMIN)
  updateHatchery(@Param('id') id: string, @Body() dto: UpdateHatcheryDto) {
    return this.referenceService.updateHatchery(id, dto);
  }

  @Delete('hatcheries/:id')
  @Roles(Role.SUPER_ADMIN)
  removeHatchery(@Param('id') id: string) {
    return this.referenceService.removeHatchery(id);
  }

  // ─── Broodstock ───────────────────────────────────────────

  @Post('broodstocks')
  @Roles(Role.SUPER_ADMIN)
  createBroodstock(@Body() dto: CreateBroodstockDto) {
    return this.referenceService.createBroodstock(dto);
  }

  @Get('broodstocks')
  findAllBroodstock(@Query('search') search?: string) {
    return this.referenceService.findAllBroodstock(search);
  }

  @Get('broodstocks/:id')
  findOneBroodstock(@Param('id') id: string) {
    return this.referenceService.findOneBroodstock(id);
  }

  @Patch('broodstocks/:id')
  @Roles(Role.SUPER_ADMIN)
  updateBroodstock(@Param('id') id: string, @Body() dto: UpdateBroodstockDto) {
    return this.referenceService.updateBroodstock(id, dto);
  }

  @Delete('broodstocks/:id')
  @Roles(Role.SUPER_ADMIN)
  removeBroodstock(@Param('id') id: string) {
    return this.referenceService.removeBroodstock(id);
  }
}
