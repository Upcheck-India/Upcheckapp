import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MortalityService } from './mortality.service';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';

@Controller('mortality')
@UseGuards(JwtAuthGuard)
export class MortalityController {
    constructor(private readonly mortalityService: MortalityService) { }

    @Post()
    create(@Body() dto: CreateMortalityRecordDto) {
        return this.mortalityService.create(dto);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.mortalityService.findByCrop(cropId);
    }
}
