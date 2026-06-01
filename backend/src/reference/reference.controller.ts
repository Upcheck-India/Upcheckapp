import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ReferenceService } from './reference.service';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { CreateHatcheryDto } from './dto/create-hatchery.dto';
import { UpdateHatcheryDto } from './dto/update-hatchery.dto';
import { CreateBroodstockDto } from './dto/create-broodstock.dto';
import { UpdateBroodstockDto } from './dto/update-broodstock.dto';

@Controller('reference')
export class ReferenceController {
    constructor(private readonly referenceService: ReferenceService) {}

    // ─── Species ──────────────────────────────────────────────

    @Post('species')
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
    updateSpecies(@Param('id') id: string, @Body() dto: UpdateSpeciesDto) {
        return this.referenceService.updateSpecies(id, dto);
    }

    @Delete('species/:id')
    removeSpecies(@Param('id') id: string) {
        return this.referenceService.removeSpecies(id);
    }

    // ─── Hatcheries ───────────────────────────────────────────

    @Post('hatcheries')
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
    updateHatchery(@Param('id') id: string, @Body() dto: UpdateHatcheryDto) {
        return this.referenceService.updateHatchery(id, dto);
    }

    @Delete('hatcheries/:id')
    removeHatchery(@Param('id') id: string) {
        return this.referenceService.removeHatchery(id);
    }

    // ─── Broodstock ───────────────────────────────────────────

    @Post('broodstocks')
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
    updateBroodstock(@Param('id') id: string, @Body() dto: UpdateBroodstockDto) {
        return this.referenceService.updateBroodstock(id, dto);
    }

    @Delete('broodstocks/:id')
    removeBroodstock(@Param('id') id: string) {
        return this.referenceService.removeBroodstock(id);
    }
}
