import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { PondsService } from './ponds.service';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ponds')
@UseGuards(JwtAuthGuard)
export class PondsController {
    constructor(private readonly pondsService: PondsService) { }

    @Post()
    create(@Body() createPondDto: CreatePondDto, @Request() req) {
        return this.pondsService.create(createPondDto, req.user.id);
    }

    @Get()
    findAll(@Query('farmId') farmId: string, @Request() req) {
        if (!farmId) {
            throw new BadRequestException('farmId query parameter is required');
        }
        return this.pondsService.findAll(farmId, req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.pondsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePondDto: UpdatePondDto, @Request() req) {
        return this.pondsService.update(id, updatePondDto, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.pondsService.remove(id, req.user.id);
    }
}
