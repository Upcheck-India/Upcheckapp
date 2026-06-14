import { Module } from '@nestjs/common';
import { LunarService } from './lunar.service';
import { LunarController } from './lunar.controller';

/**
 * Lunar Molt Module (lunar_module_spec.md). Pure engine — no DB this
 * iteration; LunarAdvisory/MoltObservation persistence + adaptive calibration
 * (spec §6/§7) are a follow-up.
 */
@Module({
  controllers: [LunarController],
  providers: [LunarService],
  exports: [LunarService],
})
export class LunarModule {}
