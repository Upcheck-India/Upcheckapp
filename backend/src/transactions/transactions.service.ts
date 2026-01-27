import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
    constructor(
        @InjectRepository(Transaction)
        private transactionsRepository: Repository<Transaction>,
    ) { }

    create(createDto: CreateTransactionDto) {
        const transaction = this.transactionsRepository.create(createDto);
        return this.transactionsRepository.save(transaction);
    }

    findAll(farmId?: string, type?: string) {
        const where: any = {};
        if (farmId) where.farmId = farmId;
        if (type) where.type = type;

        return this.transactionsRepository.find({
            where,
            order: { transactionDate: 'DESC' },
        });
    }

    findOne(id: string) {
        return this.transactionsRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateTransactionDto) {
        await this.transactionsRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.transactionsRepository.delete(id);
    }

    async getSummaryByFarm(farmId: string) {
        const income = await this.transactionsRepository
            .createQueryBuilder('t')
            .select('SUM(t.amount)', 'total')
            .where('t.farmId = :farmId', { farmId })
            .andWhere('t.type = :type', { type: 'income' })
            .getRawOne();

        const expense = await this.transactionsRepository
            .createQueryBuilder('t')
            .select('SUM(t.amount)', 'total')
            .where('t.farmId = :farmId', { farmId })
            .andWhere('t.type = :type', { type: 'expense' })
            .getRawOne();

        return {
            totalIncome: income?.total || 0,
            totalExpense: expense?.total || 0,
            netProfit: (income?.total || 0) - (expense?.total || 0),
        };
    }
}
