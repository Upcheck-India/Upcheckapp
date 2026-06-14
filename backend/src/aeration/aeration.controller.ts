import { Controller, Post, Body } from '@nestjs/common';
import { AerationService, NightDoInput } from './aeration.service';

interface AdequacyBody {
  biomassKg: number;
  installedHp: number;
}
interface PowerCostBody {
  mode: 'grid' | 'diesel';
  totalHp?: number;
  ratePerKwh?: number;
  litresPerHour?: number;
  ratePerLitre?: number;
  runHours: number;
  harvestBiomassKg?: number;
}

/** Aeration & Power Optimizer (farmer_features_spec.md §4). Pure computation. */
@Controller('aeration')
export class AerationController {
  constructor(private readonly service: AerationService) {}

  /** Installed vs required HP adequacy gauge. */
  @Post('adequacy')
  adequacy(@Body() body: AdequacyBody) {
    return this.service.adequacy(body.biomassKg, body.installedHp);
  }

  /** Predicted pre-dawn DO minimum + recommended aerator hours. */
  @Post('night-do')
  nightDo(@Body() body: NightDoInput & { doTarget?: number }) {
    const predicted = this.service.predictNightDoMin(body);
    const recommendedRunHours = this.service.recommendRunHours(
      body,
      body.doTarget ?? 4,
    );
    return { predicted, recommendedRunHours };
  }

  /** Power cost (grid or diesel) + ₹/kg contribution. */
  @Post('power-cost')
  powerCost(@Body() body: PowerCostBody) {
    const cost =
      body.mode === 'diesel'
        ? this.service.powerCostDiesel(
            body.litresPerHour ?? 0,
            body.runHours,
            body.ratePerLitre ?? 0,
          )
        : this.service.powerCostGrid(
            body.totalHp ?? 0,
            body.runHours,
            body.ratePerKwh ?? 0,
          );
    return {
      cost,
      costPerKg: body.harvestBiomassKg
        ? this.service.costPerKg(cost, body.harvestBiomassKg)
        : null,
    };
  }
}
