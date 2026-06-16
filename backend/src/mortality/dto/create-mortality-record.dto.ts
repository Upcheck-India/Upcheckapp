import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMortalityRecordDto {
    // Client-minted idempotency key — lets offline replays be safe (insert-or-return).
    @IsUUID()
    @IsOptional()
    id?: string;

    @IsUUID()
    cropId: string;

    @IsDateString()
    recordDate: string;

    @IsInt()
    @Min(0)
    quantity: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedWeightKg?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    estimatedTotal?: number;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];
}
