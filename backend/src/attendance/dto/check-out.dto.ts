import { IsDateString, IsIn, IsOptional } from 'class-validator';

export const MANAGER_CHECK_OUT_REASONS = [
  'forgot',
  'left_early',
  'shift_end',
  'other',
] as const;
export type ManagerCheckOutReason = (typeof MANAGER_CHECK_OUT_REASONS)[number];

export class CheckOutDto {
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  // Required when checking out someone else — enforced in the service.
  @IsOptional()
  @IsIn(MANAGER_CHECK_OUT_REASONS)
  reason?: ManagerCheckOutReason;
}
