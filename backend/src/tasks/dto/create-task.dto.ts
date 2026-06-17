import { IsUUID, IsString, IsOptional, IsDateString, IsIn, IsInt, Min, Max, Matches } from 'class-validator';

export const TASK_TYPES = [
    'FEED',
    'WATER_TEST',
    'SAMPLING',
    'AERATOR_CHECK',
    'MORTALITY_CHECK',
    'HARVEST_PREP',
    'OTHER',
] as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm

export class CreateTaskDto {
    @IsUUID()
    farmId: string;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsIn(TASK_TYPES as unknown as string[])
    @IsOptional()
    type?: string;

    @IsIn(['open', 'in_progress', 'done', 'verified', 'cancelled'])
    @IsOptional()
    status?: string;

    @IsIn(['low', 'medium', 'high'])
    @IsOptional()
    priority?: string;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @Matches(TIME_RE, { message: 'timeWindowStart must be HH:mm' })
    @IsOptional()
    timeWindowStart?: string;

    @Matches(TIME_RE, { message: 'timeWindowEnd must be HH:mm' })
    @IsOptional()
    timeWindowEnd?: string;

    // Pragmatic recurrence: a frequency + count generates that many dated
    // instances on creation (daily feeding, weekly sampling). Stored as an
    // RFC-5545-style recurrence_rule string for forward compatibility.
    @IsIn(['daily', 'weekly'])
    @IsOptional()
    recurrenceFreq?: 'daily' | 'weekly';

    @IsInt()
    @Min(2)
    @Max(120)
    @IsOptional()
    recurrenceCount?: number;

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
