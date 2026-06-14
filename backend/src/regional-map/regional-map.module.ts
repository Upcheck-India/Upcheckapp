import { Module } from '@nestjs/common';
import { RegionalMapService } from './regional-map.service';
import { RegionalMapController } from './regional-map.controller';

/**
 * Regional Anonymized Biosecurity Map (farmer_features_spec.md §9). Pure engine
 * — wiring opt-in disease reports from the disease module + persistence is a
 * follow-up; the k-anonymity aggregation + risk factor are here.
 */
@Module({
  controllers: [RegionalMapController],
  providers: [RegionalMapService],
  exports: [RegionalMapService],
})
export class RegionalMapModule {}
