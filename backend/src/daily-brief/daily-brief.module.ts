import { Module } from '@nestjs/common';
import { DailyBriefController } from './daily-brief.controller';
import { DailyBriefService } from './daily-brief.service';
import { MoltModule } from '../molt/molt.module';
import { PondContextModule } from '../pond-context/pond-context.module';
import { ShrimpCalculationsModule } from '../shrimp-calculations/shrimp-calculations.module';

/** Daily Brief (spec 2026-09-14). DataSource + FarmAccessService are global. */
@Module({
  imports: [MoltModule, PondContextModule, ShrimpCalculationsModule],
  controllers: [DailyBriefController],
  providers: [DailyBriefService],
})
export class DailyBriefModule {}
