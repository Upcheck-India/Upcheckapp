import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CreateFarmDto } from './create-farm.dto';

export class UpdateFarmDto extends PartialType(CreateFarmDto) {
  // IST wall clock 'HH:MM', or null to clear (spec 2026-09-14 attendance B.1).
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  shiftEndLocal?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(16)
  shiftHours?: number;

  // D4 cycle input record. Owner only (not a shift field); null/'' clears.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  caaRegistrationNo?: string | null;
}

/** Fields a manager may change; everything else on a farm stays owner-only. */
export const SHIFT_FIELDS: readonly string[] = ['shiftEndLocal', 'shiftHours'];
