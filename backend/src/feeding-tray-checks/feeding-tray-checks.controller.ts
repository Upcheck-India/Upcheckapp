import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FeedingTrayChecksService } from './feeding-tray-checks.service';
import { CreateFeedingTrayCheckDto } from './dto/create-feeding-tray-check.dto';
import { UpdateFeedingTrayCheckDto } from './dto/update-feeding-tray-check.dto';

@Controller('feeding-tray-checks')
export class FeedingTrayChecksController {
    constructor(private readonly feedingTrayChecksService: FeedingTrayChecksService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Crop', 'cropId', 'pond.farm.userId')
    create(@Body() createDto: CreateFeedingTrayCheckDto, @CurrentUser() user) {
        return this.feedingTrayChecksService.create(createDto);
    }

    @Get()
    findAll(@Query('cropId') cropId?: string) {
        return this.feedingTrayChecksService.findAll(cropId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('FeedingTrayCheck', 'id', 'crop.pond.farm.userId')
    findOne(@Param('id') id: string) {
        return this.feedingTrayChecksService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('FeedingTrayCheck', 'id', 'crop.pond.farm.userId')
    update(@Param('id') id: string, @Body() updateDto: UpdateFeedingTrayCheckDto) {
        return this.feedingTrayChecksService.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('FeedingTrayCheck', 'id', 'crop.pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.feedingTrayChecksService.remove(id);
    }
}
