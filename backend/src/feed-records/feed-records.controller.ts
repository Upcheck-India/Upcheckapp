import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FeedRecordsService } from './feed-records.service';
import { CreateFeedRecordDto } from './dto/create-feed-record.dto';
import { UpdateFeedRecordDto } from './dto/update-feed-record.dto';

@Controller('feed-records')
export class FeedRecordsController {
    constructor(private readonly feedRecordsService: FeedRecordsService) { }

    @Post()
    create(@Body() createDto: CreateFeedRecordDto) {
        return this.feedRecordsService.create(createDto);
    }

    @Get()
    findAll(@Query('pondId') pondId?: string) {
        return this.feedRecordsService.findAll(pondId);
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
