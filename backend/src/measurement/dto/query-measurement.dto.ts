import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query filter for the measurement time-series read. `param` + `cropId`/`pondId`
 * is the common shape an engine or trend chart asks for; `from`/`to` bound the
 * window. Superseded (edited-over) rows are excluded by default.
 */
export class QueryMeasurementDto {
  @IsUUID()
  @IsOptional()
  pondId?: string;

  @IsUUID()
  @IsOptional()
  cropId?: string;

  @IsString()
  @IsOptional()
  param?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  @IsOptional()
  limit?: number;
}
