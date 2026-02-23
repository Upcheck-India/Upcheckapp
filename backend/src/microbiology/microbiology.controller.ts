import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MicrobiologyService } from './microbiology.service';
import { CreateMicrobiologyDataDto } from './dto/create-microbiology-data.dto';

@Controller('microbiology-data')
export class MicrobiologyController {
    constructor(private readonly microbiologyService: MicrobiologyService) { }

    @Post()
    create(@Body() dto: CreateMicrobiologyDataDto) {
        return this.microbiologyService.create(dto);
    }

    @Get('crop/:cropId')
    findByCrop(@Param('cropId') cropId: string) {
        return this.microbiologyService.findByCrop(cropId);
    }
}
