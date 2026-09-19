import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PnlService } from './pnl.service';

/** Crop P&L + Break-Even (farmer_features_spec.md §5). */
@Controller('pnl')
export class PnlController {
  constructor(private readonly service: PnlService) {}

  /**
   * Roll up a crop's P&L: CoP/kg, break-even count, profit/margin/ROI, t/ha.
   * Break-even prices come from the farm's own quote (H5); `region` is gone.
   */
  @Get('crop/:cropId')
  cropPnl(
    @Param('cropId') cropId: string,
    @CurrentUser() user,
    @Query('areaM2') areaM2?: string,
  ) {
    return this.service.computeCropPnl(cropId, user.id, {
      areaM2: areaM2 ? Number(areaM2) : undefined,
    });
  }
}
