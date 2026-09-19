import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  HEALTH_LEVELS,
  HEALTH_SIGNS,
  HEALTH_SOURCES,
} from '../health.constants';

export class HealthSignDto {
  /** Client-minted row id — the idempotency key for this sign. */
  @IsUUID()
  id: string;

  @IsIn(HEALTH_SIGNS)
  sign: string;

  @IsIn(HEALTH_LEVELS)
  level: string;

  /** e.g. soft shells in a cast-net sample of `sampleSize`. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  count?: number;
}

/**
 * One health check = one save = one queue entry, however many signs it holds
 * (spec D6: "one screen and one save"). Each sign is its own row.
 */
export class CreateHealthObservationsDto {
  /** saveRecord's queue id; declared so the whitelist keeps it. Not stored. */
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  pondId: string;

  @IsOptional()
  @IsUUID()
  cropId?: string;

  @IsDateString()
  observedOn: string;

  @IsIn(HEALTH_SOURCES)
  source: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  sampleSize?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000000)
  moltDeaths?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  photoUrls?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(HEALTH_SIGNS.length)
  @ValidateNested({ each: true })
  @Type(() => HealthSignDto)
  signs: HealthSignDto[];
}
