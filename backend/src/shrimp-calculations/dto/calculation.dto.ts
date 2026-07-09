import { IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CalculateFcrDto {
  @IsNumber()
  @Min(0)
  totalFeedKg: number;

  @IsNumber()
  @Min(0)
  harvestWeightKg: number;
}

export class CalculateAdgDto {
  @IsNumber()
  @Min(0)
  initialWeightG: number;

  @IsNumber()
  @Min(0)
  finalWeightG: number;

  @IsNumber()
  @Min(1)
  daysOfCulture: number;
}

export class CalculateSurvivalRateDto {
  @IsNumber()
  @Min(0)
  initialStock: number;

  // Service clamps SR to 100% when harvestedCount > initialStock.
  @IsNumber()
  @Min(0)
  harvestedCount: number;
}

export class CalculateFeedingRateDto {
  @IsNumber()
  @Min(0)
  biomassKg: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  feedingPercentage: number;
}

export class CalculateExpectedHarvestDto {
  @IsNumber()
  @Min(0)
  stockingCount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  survivalRatePercent: number;

  @IsNumber()
  @Min(0)
  targetWeightG: number;
}

export class GrowthProjectionDto {
  @IsNumber()
  @Min(0)
  currentWeightG: number;

  @IsNumber()
  @Min(0)
  adgG: number;

  @IsNumber()
  @Min(0)
  daysToProject: number;
}
