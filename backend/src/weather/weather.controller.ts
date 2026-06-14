import { Controller, Post, Body } from '@nestjs/common';
import { WeatherService } from './weather.service';
import type { WeatherInput } from './weather.service';

/** Weather & Cyclone advisories (farmer_features_spec.md §8). */
@Controller('weather')
export class WeatherController {
  constructor(private readonly service: WeatherService) {}

  @Post('evaluate')
  evaluate(@Body() input: WeatherInput) {
    return this.service.evaluate(input);
  }
}
