import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PriceBandDto {
  @IsNumber()
  @Min(0)
  count: number;

  @IsNumber()
  @Min(0)
  price: number;
}

/**
 * Validated body for POST /harvest-timing/optimize. All numerics are optional
 * (the controller applies sane defaults) but must be non-negative when present
 * — a negative/NaN abw or feed price previously produced garbage advice.
 */
export class OptimizeHarvestTimingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  abwNow?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adgNow?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  adgDecay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nNow?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  dailySurvival?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carryingCapacityKgM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feedPricePerKg?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceBandDto)
  priceBands?: PriceBandDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  diseaseRisk?: number;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  horizon?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsUUID()
  pondId?: string;

  @IsOptional()
  @IsUUID()
  cropId?: string;

  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}
