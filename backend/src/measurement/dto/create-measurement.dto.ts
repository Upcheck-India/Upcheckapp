import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsInt,
  IsIn,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  MeasurementSource,
  TimeOfDay,
  MissingReason,
} from '../measurement.entity';

const SOURCES: MeasurementSource[] = [
  'manual',
  'sensor',
  'lab',
  'derived',
  'photo_ai',
];
const TIMES_OF_DAY: TimeOfDay[] = [
  'dawn',
  'morning',
  'noon',
  'evening',
  'night',
  'AM',
  'PM',
];
const MISSING_REASONS: MissingReason[] = [
  'not_measured',
  'not_applicable',
  'sensor_fail',
];

/**
 * A single reading written through the Measurement pipeline.
 *
 * Identity (`param`, value, unit, range) is validated server-side against the
 * active data-dictionary entry — this DTO only enforces shape/type. The
 * `id`/`measuredAt` may be client-supplied so a reading minted offline keeps a
 * stable identity and timestamp across an idempotent sync.
 */
export class CreateMeasurementDto {
  /** Optional client-minted UUID for idempotent offline sync. */
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  @IsNotEmpty()
  pondId: string;

  @IsUUID()
  @IsOptional()
  cropId?: string;

  @IsInt()
  @IsOptional()
  doc?: number;

  @IsString()
  @IsNotEmpty()
  param: string;

  /** Numeric reading (numeric/boolean params). Omit when `isMissingReason` set. */
  @IsNumber()
  @IsOptional()
  valueNum?: number;

  /** Coded text reading (categorical params). Omit when `isMissingReason` set. */
  @IsString()
  @IsOptional()
  valueText?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  /** ISO timestamp; defaults to now() server-side when omitted. */
  @IsDateString()
  @IsOptional()
  measuredAt?: string;

  @IsIn(TIMES_OF_DAY)
  @IsOptional()
  timeOfDay?: TimeOfDay;

  @IsIn(SOURCES)
  @IsOptional()
  source?: MeasurementSource;

  @IsString()
  @IsOptional()
  instrument?: string;

  /** Role of the enterer (e.g. farmer/worker/technician/lab) for ML weighting. */
  @IsString()
  @IsOptional()
  enteredByRole?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidence?: number;

  @IsIn(MISSING_REASONS)
  @IsOptional()
  isMissingReason?: MissingReason;
}

/**
 * Batch ingest body for offline sync. Each item is independently idempotent on
 * its `id`; partial failures are reported per-item rather than failing the set.
 */
export class CreateMeasurementBatchDto {
  @ValidateNested({ each: true })
  @Type(() => CreateMeasurementDto)
  @ArrayMaxSize(500)
  measurements: CreateMeasurementDto[];

  /** When true (default), one bad item is skipped and reported, not fatal. */
  @IsBoolean()
  @IsOptional()
  continueOnError?: boolean;
}
