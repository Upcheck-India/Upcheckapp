import { IsDateString, IsNumber, Min } from 'class-validator';

/**
 * Body for PATCH /harvest-plans/:id/complete. Validated so a negative or NaN
 * weight/price can't be multiplied into actualRevenue and written to a
 * Transaction (the inline @Body() type was erased at runtime, bypassing the
 * global ValidationPipe).
 */
export class CompletePlanDto {
  @IsDateString()
  actualHarvestDate: string;

  @IsNumber()
  @Min(0)
  actualWeightKg: number;

  @IsNumber()
  @Min(0)
  actualPricePerKg: number;
}
