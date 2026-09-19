import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** One line of the buyer's weighing slip (harvest-and-molt H1). */
export class GradeDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  /** Buyer's count (pieces/kg). Null = not graded. */
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(400)
  countPerKg?: number | null;

  @IsNumber()
  @Min(0.01)
  weightKg: number;

  /**
   * ₹/kg. 50..2000 is a warn-not-block band checked in the service (a 400
   * OUT_OF_RANGE unless `confirmOutOfRange`), so only positivity is hard here.
   * Stripped server-side for a caller without VIEW_FINANCIALS.
   */
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  pricePerKg?: number | null;
}

export const REJECTED_REASONS = ['soft_shell', 'broken', 'dead', 'other'] as const;
export type RejectedReason = (typeof REJECTED_REASONS)[number];
