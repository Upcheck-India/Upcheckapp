import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ArrayMaxSize,
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
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CountPriceBandDto)
  @IsOptional()
  priceBands?: CountPriceBandDto[];

  @IsString()
  @IsOptional()
  region?: string;
}
