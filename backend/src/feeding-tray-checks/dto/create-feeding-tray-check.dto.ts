import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  IsDateString,
  MaxLength,
  Min,
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
  @MaxLength(20)
  checkTime: string;

  @IsInt()
  @Min(1)
  trayNumber: number;

  @IsIn(['empty', 'few_left', 'a_lot_left'])
  remainingFeedStatus: string;
}
