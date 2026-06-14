import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditLedger } from './credit-ledger.entity';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';

/** Dealer credit ledger + reorder projection (farmer_features_spec.md §6). */
@Module({
  imports: [TypeOrmModule.forFeature([CreditLedger])],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
