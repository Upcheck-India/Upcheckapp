import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestRecommendation } from './harvest-recommendation.entity';
import { HarvestTimingService } from './harvest-timing.service';
import { HarvestTimingController } from './harvest-timing.controller';
import { ShrimpCalculationsModule } from '../shrimp-calculations/shrimp-calculations.module';
import { IndiaModule } from '../india/india.module';
import { PondsModule } from '../ponds/ponds.module';

/** Harvest-Timing Decision Engine (farmer_features_spec.md §1). */
@Module({
  imports: [
    TypeOrmModule.forFeature([HarvestRecommendation]),
    ShrimpCalculationsModule,
    IndiaModule,
    PondsModule,
  ],
  controllers: [HarvestTimingController],
  providers: [HarvestTimingService],
  exports: [HarvestTimingService],
})
export class HarvestTimingModule {}
