import { IsUUID, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateFeedingTrayCheckDto {
    @IsUUID()
    cropId: string;

    @IsUUID()
    @IsOptional()
    feedRecordId?: string;

    @IsDateString()
    checkDate: string;

    @IsString()
    checkTime: string;

    @IsNumber()
    trayNumber: number;

    @IsString()
    remainingFeedStatus: string; // 'empty' | 'few_left' | 'a_lot_left'
}
