import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * The one deliberate exception to `PartialWithoutScope` (S1): `pondId` stays
 * patchable so money can be re-tagged to another pond, but
 * `TransactionsService.update` requires that pond to be on the transaction's
 * OWN farm. `farmId` and `id` are never patchable.
 */
export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['id', 'farmId'] as const),
) {}
