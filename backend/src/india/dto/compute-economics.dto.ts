import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CountPriceBandDto {
  @IsNumber()
  count: number;

  @IsNumber()
  price: number;
}

export class ComputeEconomicsDto {
  @IsNumber()
  totalCost: number;

  @IsNumber()
  harvestBiomassKg: number;

  @IsNumber()
  revenue: number;

  @IsNumber()
  @IsOptional()
  areaM2?: number;

  /** Explicit price bands; if omitted, `region` is used to fetch the latest. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountPriceBandDto)
  @IsOptional()
  priceBands?: CountPriceBandDto[];

  @IsString()
  @IsOptional()
  region?: string;
}
