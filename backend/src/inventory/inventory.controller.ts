import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post()
    create(@Body() createDto: CreateInventoryItemDto) {
        return this.inventoryService.create(createDto);
    }

    @Get()
    findAll(
        @Query('farmId') farmId?: string,
        @Query('category') category?: string,
        @Query() pageOptionsDto?: PageOptionsDto
    ) {
        return this.inventoryService.findAll(farmId, category, pageOptionsDto);
    }

    @Get('low-stock/:farmId')
    getLowStock(
        @Param('farmId') farmId: string,
        @Query() pageOptionsDto?: PageOptionsDto
    ) {
        return this.inventoryService.getLowStock(farmId, pageOptionsDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.inventoryService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateInventoryItemDto) {
        return this.inventoryService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.inventoryService.remove(id);
    }
}
