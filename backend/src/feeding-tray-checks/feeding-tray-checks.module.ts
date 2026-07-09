import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedingTrayChecksService } from './feeding-tray-checks.service';
import { FeedingTrayChecksController } from './feeding-tray-checks.controller';
import { FeedingTrayCheck } from './feeding-tray-check.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeedingTrayCheck])],
  controllers: [FeedingTrayChecksController],
  providers: [FeedingTrayChecksService],
  exports: [FeedingTrayChecksService],
})
export class FeedingTrayChecksModule {}
