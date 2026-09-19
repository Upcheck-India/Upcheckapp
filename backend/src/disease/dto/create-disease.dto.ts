import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CONFIRMED_BY,
  DISEASE_OUTCOMES,
  DISEASE_SEVERITIES,
  HEALTH_SIGNS,
} from '../../health-observations/health.constants';

export class CreateDiseaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  scientificName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  commonNames?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  symptoms?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  preventionMeasures?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  treatmentRecommendations?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  severityLevel?: string;
}

export class CreateDiseaseRecordDto {
  // Client-minted idempotency key — lets offline replays be safe (insert-or-return).
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  cropId: string;

  @IsUUID()
  diseaseId: string;

  @IsDateString()
  recordedDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  severityAtDetection?: string;

  /** `health/` photo paths of this crop's farm (D6); checked in the service. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // ── D6 ──
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(HEALTH_SIGNS.length)
  @IsIn(HEALTH_SIGNS, { each: true })
  symptomSigns?: string[];

  @IsOptional()
  @IsIn(DISEASE_SEVERITIES)
  severity?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  affectedPct?: number;

  @IsOptional()
  @IsIn(CONFIRMED_BY)
  confirmedBy?: string;

  @IsOptional()
  @IsDateString()
  confirmedOn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  labName?: string;

  @IsOptional()
  @IsIn(DISEASE_OUTCOMES)
  outcome?: string;

  @IsOptional()
  @IsDateString()
  resolvedOn?: string;
}
