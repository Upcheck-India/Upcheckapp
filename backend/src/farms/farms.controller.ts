import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
@Controller('farms')
export class FarmsController {
    constructor(private readonly farmsService: FarmsService) { }

    @Post()
    create(@Body() createFarmDto: CreateFarmDto, @CurrentUser() user) {
        return this.farmsService.create(createFarmDto, user.id);
    }

    @Get()
    findAll(@CurrentUser() user) {
        return this.farmsService.findAll(user.id);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Farm')
    findOne(@Param('id') id: string) {
        return this.farmsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Farm')
    update(@Param('id') id: string, @Body() updateFarmDto: UpdateFarmDto) {
        return this.farmsService.update(id, updateFarmDto);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Farm')
    remove(@Param('id') id: string) {
        return this.farmsService.remove(id);
    }
}
