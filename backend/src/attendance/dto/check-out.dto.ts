import { IsDateString, IsOptional } from 'class-validator';

export class CheckOutDto {
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;
}
