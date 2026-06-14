import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsObject,
  IsIn,
} from 'class-validator';

export class CreatePriceFeedDto {
  @IsString()
  @IsNotEmpty()
  region: string;

  @IsDateString()
  date: string;

  /** count band → ₹/kg, e.g. { "30": 520, "40": 430, "50": 360 }. */
  @IsObject()
  prices: Record<string, number>;

  @IsString()
  @IsOptional()
  @IsIn(['processor', 'local_agent', 'self'])
  source?: string;
}
