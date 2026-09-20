import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MORTALITY_CAUSES } from '../../health-observations/health.constants';

export class UpdateMortalityRecordDto {
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  // Omitted with a new `quantity` → the service recomputes it (H6).
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedWeightKg?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(MORTALITY_CAUSES)
  suspectedCause?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  photoUrls?: string[];
}
