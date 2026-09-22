import { PHOTO_SURFACES } from '../../storage/photo-surfaces';
import {
  ArrayMaxSize,
  IsArray,
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

  /** F5: tray photos (cap 2). Optional; the check saves without it. Wins over `photoPath`. */
  @IsArray()
  @ArrayMaxSize(PHOTO_SURFACES.feed_tray.cap)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @IsOptional()
  photoPaths?: string[];

  /** Pre-cap-2 clients (and their queued offline saves): one photo. */
  @IsString()
  @IsOptional()
  @MaxLength(200)
  photoPath?: string | null;
}
