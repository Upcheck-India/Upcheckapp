import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChemicalService } from './chemical.service';
import { CreateChemicalDataDto } from './dto/create-chemical-data.dto';

@Controller('chemical-data')
@UseGuards(JwtAuthGuard)
export class ChemicalController {
    constructor(private readonly chemicalService: ChemicalService) { }

    @Post()
    create(@Body() dto: CreateChemicalDataDto) {
        return this.chemicalService.create(dto);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.chemicalService.findByCrop(cropId);
    }
}
