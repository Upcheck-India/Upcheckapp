import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { MORTALITY_CAUSES } from '../../health-observations/health.constants';

export class CreateMortalityRecordDto {
  // Client-minted idempotency key — lets offline replays be safe (insert-or-return).
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  cropId: string;

  @IsDateString()
  recordDate: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedWeightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedTotal?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsIn(MORTALITY_CAUSES)
  suspectedCause?: string;

  /** `health/` photo paths from POST /health-observations/photos/:pondId. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  photoUrls?: string[];
}
