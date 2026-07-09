import {
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateHarvestPlanDto {
  @IsUUID()
  pondId: string;

  @IsUUID()
  @IsOptional()
  cropId?: string;

  @IsDateString()
  @IsOptional()
  plannedHarvestDate?: string;

  @IsNumber()
  @IsOptional()
  targetWeightKg?: number;

  @IsNumber()
  @IsOptional()
  expectedPricePerKg?: number;

  @IsNumber()
  @IsOptional()
  expectedRevenue?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
