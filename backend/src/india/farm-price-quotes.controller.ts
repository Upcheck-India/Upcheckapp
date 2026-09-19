import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { PricingService } from './pricing.service';
import { CreateFarmQuoteDto } from './dto/create-farm-quote.dto';

/**
 * The farm price book (harvest-and-molt H5): the farm's own buyer quotes.
 * Prices are money — both read and write need VIEW_FINANCIALS.
 */
@Controller('price-quotes')
export class FarmPriceQuotesController {
  constructor(
    private readonly pricing: PricingService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  /** The current quote (with age/status) and the counts the sheet starts from. */
  @Get('farm/:farmId/current')
  async current(
    @Param('farmId', ParseUUIDPipe) farmId: string,
    @CurrentUser() user,
  ) {
    await this.farmAccess.assertCanAccessFarm(user.id, farmId, 'VIEW_FINANCIALS');
    return this.pricing.currentQuote(farmId);
  }

  /** Save today's buyer quote. Online-only by design (not pond data). */
  @Post('farm/:farmId')
  async create(
    @Param('farmId', ParseUUIDPipe) farmId: string,
    @Body() dto: CreateFarmQuoteDto,
    @CurrentUser() user,
  ) {
    await this.farmAccess.assertCanAccessFarm(user.id, farmId, 'VIEW_FINANCIALS');
    return this.pricing.createQuote(farmId, dto, user.id);
  }
}
