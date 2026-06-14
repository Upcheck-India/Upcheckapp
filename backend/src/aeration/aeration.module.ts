import { Module } from '@nestjs/common';
import { AerationService } from './aeration.service';
import { AerationController } from './aeration.controller';

/**
 * Aeration & Power Optimizer (farmer_features_spec.md §4). Pure engine — the
 * Aerator/AeratorRun registries + power-cost tracking persistence are a
 * follow-up (and overlap with the P3 device registry).
 */
@Module({
  controllers: [AerationController],
  providers: [AerationService],
  exports: [AerationService],
})
export class AerationModule {}
