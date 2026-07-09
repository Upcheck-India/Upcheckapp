import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../finances/expense.entity';
import { Harvest } from '../harvests/harvest.entity';
import { Crop } from '../crops/crop.entity';
import { PnlService } from './pnl.service';
import { PnlController } from './pnl.controller';
import { IndiaModule } from '../india/india.module';

/** Crop P&L / Cost Accounting + Break-Even (farmer_features_spec.md §5). */
@Module({
  imports: [TypeOrmModule.forFeature([Expense, Harvest, Crop]), IndiaModule],
  controllers: [PnlController],
  providers: [PnlService],
  exports: [PnlService],
})
export class PnlModule {}
