import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import type { MissingReason } from '../measurement.entity';

const MISSING_REASONS: MissingReason[] = [
  'not_measured',
  'not_applicable',
  'sensor_fail',
];

/**
 * Edit a prior measurement. This never mutates the original row — the service
 * appends a new measurement with `editedFrom` set and supersedes the original,
 * preserving the immutable raw value + a recoverable edit log.
 *
 * Only the value channel is editable; identity (`pond`, `crop`, `param`,
 * `measuredAt`) is carried over from the original to keep the time series
 * coherent.
 */
export class EditMeasurementDto {
  @IsNumber()
  @IsOptional()
  valueNum?: number;

  @IsString()
  @IsOptional()
  valueText?: string;

  @IsIn(MISSING_REASONS)
  @IsOptional()
  isMissingReason?: MissingReason;
}
