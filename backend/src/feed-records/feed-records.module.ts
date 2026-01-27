import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedRecordsService } from './feed-records.service';
import { FeedRecordsController } from './feed-records.controller';
import { FeedRecord } from './feed-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeedRecord])],
  controllers: [FeedRecordsController],
  providers: [FeedRecordsService],
  exports: [FeedRecordsService],
})
export class FeedRecordsModule { }
