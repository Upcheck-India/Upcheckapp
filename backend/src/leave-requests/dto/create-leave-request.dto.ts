import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLeaveRequestDto {
  // Client-minted id from the offline sync queue, for idempotent replay.
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  farmId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
