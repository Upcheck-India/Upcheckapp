import { IsUUID, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateTaskDto {
    @IsUUID()
    farmId: string;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsIn(['open', 'in_progress', 'done'])
    @IsOptional()
    status?: string;

    @IsIn(['low', 'medium', 'high'])
    @IsOptional()
    priority?: string;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsUUID()
    @IsOptional()
    pondId?: string;

    @IsUUID()
    @IsOptional()
    cropId?: string;

    @IsUUID()
    @IsOptional()
    assignedToId?: string;
}
