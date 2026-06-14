import { Controller, Post, Body } from '@nestjs/common';
import { RegionalMapService } from './regional-map.service';
import type { DiseaseReport, RegionalRiskInput } from './regional-map.service';

interface HeatmapBody {
  reports: DiseaseReport[];
  gridDeg?: number;
  k?: number;
}

/** Regional Anonymized Biosecurity Map (farmer_features_spec.md §9). */
@Controller('regional-map')
export class RegionalMapController {
  constructor(private readonly service: RegionalMapService) {}

  /** Regional disease risk factor for a pond (k-anonymized). */
  @Post('risk')
  risk(@Body() body: RegionalRiskInput) {
    return this.service.regionalRiskFactor(body);
  }

  /** k-anonymized heat map of disease pressure by geo-cluster. */
  @Post('heatmap')
  heatmap(@Body() body: HeatmapBody) {
    return this.service.buildHeatmap(body.reports ?? [], {
      gridDeg: body.gridDeg,
      k: body.k,
    });
  }
}
