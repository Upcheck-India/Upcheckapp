import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateSamplingDto {
  // Client-minted idempotency key — lets offline replays be safe (insert-or-return).
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  pondId: string;

  @IsUUID()
  @IsOptional()
  cropId?: string;

  @IsDateString()
  samplingDate: string;

  // Physical bounds (VALID-1): weights/counts are non-negative; survival rate
  // is a percentage 0–100. Permissive — catch typos, not real edge readings.
  @IsNumber()
  @IsOptional()
  @Min(0)
  mbwG?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalSamples?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stdDeviation?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  biomassEstimationKg?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  srEstimationPercent?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  photoUrls?: string[];
}
