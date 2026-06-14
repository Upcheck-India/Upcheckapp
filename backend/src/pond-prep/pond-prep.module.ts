import { Module } from '@nestjs/common';
import { PondPrepService } from './pond-prep.service';
import { PondPrepController } from './pond-prep.controller';

/**
 * Pre-Stocking Pond-Prep SOP (farmer_features_spec.md §7). Pure engine —
 * per-pond checklist persistence + the Start-Cycle gate wiring is a follow-up.
 */
@Module({
  controllers: [PondPrepController],
  providers: [PondPrepService],
  exports: [PondPrepService],
})
export class PondPrepModule {}
