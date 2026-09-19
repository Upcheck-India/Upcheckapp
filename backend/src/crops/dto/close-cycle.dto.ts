import { IsDateString, IsIn, IsOptional } from 'class-validator';

/**
 * Body for PATCH /crops/:id/close. A real DTO (not an inline type) so the
 * global ValidationPipe runs: a malformed date is a 400, not a raw 500 from
 * Postgres, and with whitelist:true nothing else rides along.
 */
export class CloseCycleDto {
  @IsDateString()
  actualHarvestDate: string;

  /**
   * Why a cycle closed WITHOUT a harvest (H2): 'lost' (crop failure) or
   * 'other'. A harvested cycle closes through a full harvest instead.
   */
  @IsOptional()
  @IsIn(['lost', 'other'])
  closeReason?: 'lost' | 'other';
}
