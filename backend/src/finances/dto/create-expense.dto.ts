import { IsUUID, IsDateString, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { ExpenseCategory } from '../expense.entity';

export class CreateExpenseDto {
    @IsUUID()
    pondId: string;

    @IsUUID()
    @IsOptional()
    cropId?: string;

    @IsDateString()
    date: string;

    @IsEnum(ExpenseCategory)
    category: ExpenseCategory;

    @IsNumber()
    amount: number;

    @IsString()
    @IsOptional()
    description?: string;
}
