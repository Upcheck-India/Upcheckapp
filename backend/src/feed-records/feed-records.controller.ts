import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FeedRecordsService } from './feed-records.service';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';

@Controller('feed-records')
export class FeedRecordsController {
    constructor(private readonly feedRecordsService: FeedRecordsService) { }

    @Post()
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'pondId', 'farm.userId')
    create(@Body() createDto: CreateFeedRecordDto, @CurrentUser() user) {
        return this.feedRecordsService.create(createDto, user.id);
    }

    @Get()
    findAll(
        @Query('pondId') pondId?: string,
        @Query('cropId') cropId?: string,
        @Query() pageOptionsDto?: PageOptionsDto
    ) {
        return this.feedRecordsService.findAll(pondId, cropId, pageOptionsDto);
    }

    @Get('pond/:pondId/total')
    @UseGuards(OwnershipGuard)
    @OwnsResource('Pond', 'pondId', 'farm.userId', 'READ')
    getTotalFeed(@Param('pondId') pondId: string) {
        return this.feedRecordsService.getTotalFeedByPond(pondId);
    }

    @Get(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('FeedRecord', 'id', 'pond.farm.userId', 'READ')
    findOne(@Param('id') id: string) {
        return this.feedRecordsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('FeedRecord', 'id', 'pond.farm.userId')
    update(@Param('id') id: string, @Body() updateDto: UpdateFeedRecordDto, @CurrentUser() user) {
        return this.feedRecordsService.update(id, updateDto, user.id);
    }

    @Delete(':id')
    @UseGuards(OwnershipGuard)
    @OwnsResource('FeedRecord', 'id', 'pond.farm.userId')
    remove(@Param('id') id: string) {
        return this.feedRecordsService.remove(id);
    }
}
