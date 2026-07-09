import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateHarvestDto {
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  weightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  count?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  averageSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePriceTotal?: number;

  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  @IsIn(['partial', 'full'])
  harvestType?: 'partial' | 'full';

  @IsOptional()
  @IsIn(['pending', 'sold', 'discarded'])
  status?: 'pending' | 'sold' | 'discarded';

  @IsOptional()
  @IsString()
  notes?: string;
}
