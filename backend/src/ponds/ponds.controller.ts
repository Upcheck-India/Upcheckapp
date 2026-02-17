import {
    Controller, Get, Post, Body, Patch, Param, Delete,
    Query, UseGuards, Request, BadRequestException, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
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
    findAll(
        @Query('farmId') farmId: string,
        @Query('status') status: string,
        @Query('search') search: string,
        @Query('sort') sort: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('includeArchived') includeArchived: string,
        @Request() req,
    ) {
        if (!farmId) {
            throw new BadRequestException('farmId query parameter is required');
        }
        return this.pondsService.findAll(farmId, req.user.id, {
            status,
            search,
            sort,
            page,
            includeArchived: includeArchived === 'true',
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.pondsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePondDto: UpdatePondDto, @Request() req) {
        return this.pondsService.update(id, updatePondDto, req.user.id);
    }

    @Patch(':id/archive')
    archive(@Param('id') id: string, @Request() req) {
        return this.pondsService.archive(id, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.pondsService.remove(id, req.user.id);
    }

    @Get(':id/dimension-history')
    getDimensionHistory(@Param('id') id: string, @Request() req) {
        return this.pondsService.getDimensionHistory(id, req.user.id);
    }
}
