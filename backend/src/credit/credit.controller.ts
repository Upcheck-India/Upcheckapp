import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreditService } from './credit.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { RepayCreditDto } from './dto/repay-credit.dto';

/** Inventory Credit / Dealer tracking (farmer_features_spec.md §6). */
@Controller('credit')
export class CreditController {
  constructor(private readonly service: CreditService) {}

  @Post()
  create(@Body() body: CreateCreditDto, @CurrentUser() user) {
    return this.service.create(body, user.id);
  }

  @Get()
  list(@CurrentUser() user) {
    return this.service.list(user.id);
  }

  @Get('summary')
  summary(@CurrentUser() user) {
    return this.service.summary(user.id);
  }

  @Patch(':id/repay')
  repay(
    @Param('id') id: string,
    @Body() body: RepayCreditDto,
    @CurrentUser() user,
  ) {
    return this.service.recordRepayment(id, body.amount, user.id);
  }

  /** Pure reorder check (qty/threshold/burn/leadTime). */
  @Get('reorder-check')
  reorderCheck(
    @Query('qty') qty: string,
    @Query('threshold') threshold: string,
    @Query('dailyBurn') dailyBurn: string,
    @Query('leadTimeDays') leadTimeDays: string,
  ) {
    const q = Number(qty);
    const burn = Number(dailyBurn);
    return {
      daysToRunout: this.service.daysToRunout(q, burn),
      reorderNeeded: this.service.reorderNeeded(
        q,
        Number(threshold),
        burn,
        Number(leadTimeDays),
      ),
    };
  }
}
