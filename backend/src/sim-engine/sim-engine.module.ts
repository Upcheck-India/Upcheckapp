import { Module } from '@nestjs/common';
import { SimEngineService } from './sim-engine.service';
import { SimEngineController } from './sim-engine.controller';

/**
 * Day-by-day Simulation engine (jala_teardown.md §12). Pure — distinct from the
 * existing baseline `simulations` module. Persisting saved scenarios is a
 * follow-up.
 */
@Module({
  controllers: [SimEngineController],
  providers: [SimEngineService],
  exports: [SimEngineService],
})
export class SimEngineModule {}
