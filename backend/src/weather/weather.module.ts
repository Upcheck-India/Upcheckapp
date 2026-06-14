import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

/**
 * Weather & Cyclone alerts (farmer_features_spec.md §8). Pure rules engine;
 * IMD feed integration + emitting into the Alert Center is a follow-up.
 */
@Module({
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
