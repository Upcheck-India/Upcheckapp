import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { FeedRecordsService } from './feed-records.service';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feed-records')
@UseGuards(JwtAuthGuard)
export class FeedRecordsController {
    constructor(private readonly feedRecordsService: FeedRecordsService) { }

    @Post()
    create(@Body() createDto: CreateFeedRecordDto, @CurrentUser() user) {
        return this.feedRecordsService.create(createDto, user.id);
    }

    @Get()
    findAll(
        @Query('pondId') pondId?: string,
        @Query() pageOptionsDto?: PageOptionsDto
    ) {
        return this.feedRecordsService.findAll(pondId, pageOptionsDto);
    }

    @Get('pond/:pondId/total')
    getTotalFeed(@Param('pondId') pondId: string) {
        return this.feedRecordsService.getTotalFeedByPond(pondId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.feedRecordsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateFeedRecordDto) {
        return this.feedRecordsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.feedRecordsService.remove(id);
    }
}
