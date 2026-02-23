import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FeedingTrayChecksService } from './feeding-tray-checks.service';
import { CreateFeedingTrayCheckDto } from './dto/create-feeding-tray-check.dto';
import { UpdateFeedingTrayCheckDto } from './dto/update-feeding-tray-check.dto';
@Controller('feeding-tray-checks')
export class FeedingTrayChecksController {
    constructor(private readonly feedingTrayChecksService: FeedingTrayChecksService) { }

    @Post()
    create(@Body() createDto: CreateFeedingTrayCheckDto) {
        return this.feedingTrayChecksService.create(createDto);
    }

    @Get()
    findAll(@Query('cropId') cropId?: string) {
        return this.feedingTrayChecksService.findAll(cropId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.feedingTrayChecksService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateFeedingTrayCheckDto) {
        return this.feedingTrayChecksService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.feedingTrayChecksService.remove(id);
    }
}
