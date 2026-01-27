import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PondsService } from './ponds.service';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';

@Controller('ponds')
export class PondsController {
    constructor(private readonly pondsService: PondsService) { }

    @Post()
    create(@Body() createPondDto: CreatePondDto) {
        return this.pondsService.create(createPondDto);
    }

    @Get()
    findAll(@Query('farmId') farmId?: string) {
        return this.pondsService.findAll(farmId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pondsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePondDto: UpdatePondDto) {
        return this.pondsService.update(id, updatePondDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pondsService.remove(id);
    }
}
