import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import {
    Controller, Get, Post, Body, Patch, Param, Delete,
    Query, UseGuards, Request, BadRequestException, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { PondsService } from './ponds.service';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ponds')
@UseGuards(JwtAuthGuard)
export class PondsController {
    constructor(private readonly pondsService: PondsService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Farm', 'farmId')
    create(@Body() createPondDto: CreatePondDto, @CurrentUser() user) {
        return this.pondsService.create(createPondDto, user.id);
    }

    @Get('mine')
    findAllForUser(@CurrentUser() user) {
        return this.pondsService.findAllForUser(user.id);
    }

    @Get()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Farm', 'farmId')
    findAll(
        @Query('farmId') farmId: string,
        @Query('status') status: string,
        @Query('search') search: string,
        @Query('sort') sort: string,
        @Query('includeArchived') includeArchived: string,
        @CurrentUser() user,
        @Query() pageOptionsDto: PageOptionsDto,
    ) {
        if (!farmId) {
            throw new BadRequestException('farmId query parameter is required');
        }
        return this.pondsService.findAll(farmId, user.id, {
            status,
            search,
            sort,
            includeArchived: includeArchived === 'true',
        }, pageOptionsDto);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'id', 'farm.userId')
    findOne(@Param('id') id: string, @CurrentUser() user) {
        return this.pondsService.findOne(id, user.id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'id', 'farm.userId')
    update(@Param('id') id: string, @Body() updatePondDto: UpdatePondDto, @CurrentUser() user) {
        return this.pondsService.update(id, updatePondDto, user.id);
    }

    @Patch(':id/archive')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'id', 'farm.userId')
    archive(@Param('id') id: string, @CurrentUser() user) {
        return this.pondsService.archive(id, user.id);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'id', 'farm.userId')
    remove(@Param('id') id: string, @CurrentUser() user) {
        return this.pondsService.remove(id, user.id);
    }

    @Get(':id/dimension-history')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'id', 'farm.userId')
    getDimensionHistory(
        @Param('id') id: string,
        @CurrentUser() user,
        @Query() pageOptionsDto: PageOptionsDto
    ) {
        return this.pondsService.getDimensionHistory(id, user.id, pageOptionsDto);
    }
}
