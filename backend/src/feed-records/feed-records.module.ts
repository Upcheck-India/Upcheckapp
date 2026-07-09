import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedRecordsService } from './feed-records.service';
import { FeedRecordsController } from './feed-records.controller';
import { FeedRecord } from './feed-record.entity';

import { PondsModule } from '../ponds/ponds.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedRecord]),
    PondsModule,
    InventoryModule,
  ],
  controllers: [FeedRecordsController],
  providers: [FeedRecordsService],
  exports: [FeedRecordsService],
})
export class FeedRecordsModule {}
