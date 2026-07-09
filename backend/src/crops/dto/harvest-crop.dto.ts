import { IsNumber, Min, IsDateString } from 'class-validator';

/**
 * Body for PATCH /crops/:id/harvest. A dedicated DTO (not an inline type) so the
 * global ValidationPipe runs: it rejects negative/NaN weights and — with
 * whitelist:true — strips any other crop columns a client tries to smuggle in
 * (status, stockingCount, pondId), which the old `...harvestData` spread let
 * through to cropsRepository.update.
 */
export class HarvestCropDto {
  @IsDateString()
  actualHarvestDate: string;

  @IsNumber()
  @Min(0.01)
  harvestWeightKg: number;
}
