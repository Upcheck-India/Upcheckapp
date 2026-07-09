import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  farmId: string;

  @IsDateString()
  transactionDate: string;

  @IsString()
  @IsIn(['income', 'expense'])
  type: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;
}
