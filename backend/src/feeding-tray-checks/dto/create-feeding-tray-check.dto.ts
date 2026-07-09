import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreateFeedingTrayCheckDto {
  // Client-minted idempotency key — lets offline replays be safe (insert-or-return).
  @IsUUID()
  @IsOptional()
  id?: string;

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
