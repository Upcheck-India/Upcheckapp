import { IsDateString, IsNumber, Min } from 'class-validator';

/**
 * Body for the pre-H4 PATCH /harvest-plans/:id/complete (compatibility shim).
 * The values become one harvest grade line, so they carry the grade's bounds:
 * a harvest weighs something (harvest_grades CHECK weight_kg > 0).
 */
export class CompletePlanDto {
  @IsDateString()
  actualHarvestDate: string;

  @IsNumber()
  @Min(0.01)
  actualWeightKg: number;

  @IsNumber()
  @Min(0.01)
  actualPricePerKg: number;
}
