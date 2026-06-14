import { Controller, Post, Body } from '@nestjs/common';
import { SimEngineService } from './sim-engine.service';
import type { SimInput } from './sim-engine.service';

/** Day-by-day growth/feed/harvest Simulation engine (jala_teardown.md §12). */
@Controller('sim-engine')
export class SimEngineController {
  constructor(private readonly service: SimEngineService) {}

  /** Run a full simulation; pure computation, no persistence. */
  @Post('run')
  run(@Body() input: SimInput) {
    return this.service.run(input);
  }
}
