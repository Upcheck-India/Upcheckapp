import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from './expense.entity';
import { PondsModule } from '../ponds/ponds.module';
import { HarvestsModule } from '../harvests/harvests.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Expense]),
        PondsModule,
        HarvestsModule,
    ],
    controllers: [ExpensesController],
    providers: [ExpensesService],
    exports: [ExpensesService],
})
export class FinancesModule { }
