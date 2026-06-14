import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceFeed } from './price-feed.entity';
import { UnitsService } from './units.service';
import { EconomicsService } from './economics.service';
import { PricingService } from './pricing.service';
import { IndiaController } from './india.controller';

/**
 * India layer (jala_teardown_india.md): units/money conversions, count-based
 * pricing, and INR economics. Services are exported so the Harvest-Timing and
 * Crop P&L engines can reuse them.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PriceFeed])],
  controllers: [IndiaController],
  providers: [UnitsService, EconomicsService, PricingService],
  exports: [UnitsService, EconomicsService, PricingService],
})
export class IndiaModule {}
