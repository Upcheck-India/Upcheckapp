import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
} from 'class-validator';

export class CreateHarvestDto {
  @IsUUID()
  cropId: string;

  @IsDateString()
  harvestDate: string;

  @IsNumber()
  @Min(0.01)
  weightKg: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  count?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  averageSize?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salePriceTotal?: number;

  @IsString()
  @IsOptional()
  buyerName?: string;

  @IsIn(['partial', 'full'])
  harvestType: 'partial' | 'full';

  @IsIn(['pending', 'sold', 'discarded'])
  @IsOptional()
  status?: 'pending' | 'sold' | 'discarded';

  @IsString()
  @IsOptional()
  notes?: string;
}
