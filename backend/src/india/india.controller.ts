import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { EconomicsService } from './economics.service';
import { PricingService } from './pricing.service';
import { CreatePriceFeedDto } from './dto/create-price-feed.dto';
import { ComputeEconomicsDto } from './dto/compute-economics.dto';

/**
 * India layer endpoints (jala_teardown_india.md): count-based pricing feed and
 * INR crop economics (CoP/kg, break-even count, profit/margin/ROI, t/ha).
 */
@Controller('india')
export class IndiaController {
  constructor(
    private readonly economics: EconomicsService,
    private readonly pricing: PricingService,
  ) {}

  /** Roll up crop economics; resolves price bands from `region` if not given. */
  @Post('economics')
  async computeEconomics(@Body() dto: ComputeEconomicsDto) {
    let priceBands = dto.priceBands;
    if (!priceBands && dto.region) {
      const feed = await this.pricing.latestForRegion(dto.region);
      priceBands = feed ? this.pricing.bandsFromPrices(feed.prices) : undefined;
    }
    return this.economics.compute({
      totalCost: dto.totalCost,
      harvestBiomassKg: dto.harvestBiomassKg,
      revenue: dto.revenue,
      areaM2: dto.areaM2,
      priceBands,
    });
  }

  /** ₹/kg for an achieved count in a region (nearest band, latest feed). */
  @Get('price')
  async priceForCount(
    @Query('region') region: string,
    @Query('count') count: string,
  ) {
    if (!region || !count) {
      throw new BadRequestException('region and count are required');
    }
    const price = await this.pricing.priceForCount(region, Number(count));
    return { region, count: Number(count), pricePerKg: price };
  }

  /** Latest price feeds for a region. Public so it can seed UIs. */
  @Public()
  @Get('price-feeds')
  listFeeds(@Query('region') region: string) {
    if (!region) throw new BadRequestException('region is required');
    return this.pricing.findByRegion(region);
  }

  /**
   * Write a regional price feed — staff only. Any signed-in farmer could
   * write prices for any region, and those prices feed Harvest Timing and
   * P&L. `@Public()` drops the farmer JWT; AdminKeyGuard is the auth, as on
   * the other admin endpoints. The farmer's own quotes are a separate,
   * farm-scoped feature (spec H5), not this table.
   */
  @Public()
  @UseGuards(AdminKeyGuard)
  @Post('price-feeds')
  createFeed(@Body() dto: CreatePriceFeedDto) {
    return this.pricing.create(dto);
  }
}
