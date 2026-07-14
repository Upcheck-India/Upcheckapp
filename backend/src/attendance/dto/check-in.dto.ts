import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CheckInDto {
  // Client-minted id from the offline sync queue, for idempotent replay.
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  farmId: string;

  // Whose attendance this is. Optional — defaults to the caller (self
  // check-in); a manager/owner may supply a different worker's id to
  // back-fill a record, enforced in the service.
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  checkInAt?: string;
}
