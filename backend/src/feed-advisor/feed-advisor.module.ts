import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedPlan } from './feed-plan.entity';
import { FeedAdvisorService } from './feed-advisor.service';
import { FeedAdvisorController } from './feed-advisor.controller';
import { ShrimpCalculationsModule } from '../shrimp-calculations/shrimp-calculations.module';
import { PondsModule } from '../ponds/ponds.module';

/** Daily Feed Advisor (farmer_features_spec.md §3). */
@Module({
  imports: [
    TypeOrmModule.forFeature([FeedPlan]),
    ShrimpCalculationsModule,
    PondsModule,
  ],
  controllers: [FeedAdvisorController],
  providers: [FeedAdvisorService],
  exports: [FeedAdvisorService],
})
export class FeedAdvisorModule {}
