import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanktonService } from './plankton.service';
import { CreatePlanktonDataDto } from './dto/create-plankton-data.dto';

@Controller('plankton-data')
@UseGuards(JwtAuthGuard)
export class PlanktonController {
    constructor(private readonly planktonService: PlanktonService) { }

    @Post()
    create(@Body() dto: CreatePlanktonDataDto) {
        return this.planktonService.create(dto);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.planktonService.findByCrop(cropId);
    }
}
