import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('farms')
@UseGuards(JwtAuthGuard)
export class FarmsController {
    constructor(private readonly farmsService: FarmsService) { }

    @Post()
    create(@Body() createFarmDto: CreateFarmDto, @Request() req) {
        return this.farmsService.create(createFarmDto, req.user.id);
    }

    @Get()
    findAll(@Request() req) {
        return this.farmsService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.farmsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFarmDto: UpdateFarmDto, @Request() req) {
        return this.farmsService.update(id, updateFarmDto, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.farmsService.remove(id, req.user.id);
    }
}
