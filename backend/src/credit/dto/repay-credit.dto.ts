import { IsNumber, Min } from 'class-validator';

/**
 * Body for PATCH /credit/:id/repay. Validated so a negative/NaN/string amount
 * can't corrupt the ledger (the previous inline RepaymentBody interface erased
 * to Object at runtime, bypassing the global ValidationPipe).
 */
export class RepayCreditDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
