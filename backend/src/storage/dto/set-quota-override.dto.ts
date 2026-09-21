import { IsInt, IsNotEmpty, IsString, Max, Min, MaxLength } from 'class-validator';
import { QUOTA_OVERRIDE_LIMITS } from '../photo-ledger.service';

/**
 * PUT /admin/users/:id/storage/limit — a per-account override of
 * PhotoLedgerService's default quota. `reason` is required: this is a
 * support/billing action taken on someone else's account and has to be
 * attributable and explainable after the fact (photo_quota_override_events).
 * Lowering below current usage is allowed (validated at the DB, not here) —
 * the caller warns about it, it does not refuse it.
 */
export class SetQuotaOverrideDto {
  @IsInt()
  @Min(1)
  @Max(QUOTA_OVERRIDE_LIMITS.maxPhotos)
  maxPhotos!: number;

  @IsInt()
  @Min(1)
  @Max(QUOTA_OVERRIDE_LIMITS.maxBytes)
  maxBytes!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

/** DELETE /admin/users/:id/storage/limit — reset to the default quota. */
export class ResetQuotaOverrideDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
