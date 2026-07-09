import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustStockDto {
  /** Signed delta applied to the current quantity (negative to consume stock). */
  @IsNumber()
  adjustment: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
