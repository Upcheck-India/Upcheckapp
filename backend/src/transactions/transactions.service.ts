import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FarmsService } from '../farms/farms.service';

@Injectable()
export class TransactionsService {
    constructor(
        @InjectRepository(Transaction)
        private transactionsRepository: Repository<Transaction>,
        private readonly farmsService: FarmsService,
    ) { }

    async create(createDto: CreateTransactionDto, userId: string) {
        // Reject transactions against a farm the caller does not own.
        await this.farmsService.verifyOwnership(createDto.farmId, userId);
        const transaction = this.transactionsRepository.create(createDto);
        return this.transactionsRepository.save(transaction);
    }

    async findAll(userId: string, farmId?: string, type?: string) {
        const where: any = {};
        if (type) where.type = type;

        if (farmId) {
            await this.farmsService.verifyOwnership(farmId, userId);
            where.farmId = farmId;
        } else {
            // Restrict to farms the caller owns.
            const farms = await this.farmsService.findAll(userId);
            const farmIds = farms.map((f) => f.id);
            if (farmIds.length === 0) return [];
            where.farmId = In(farmIds);
        }

        return this.transactionsRepository.find({
            where,
            order: { transactionDate: 'DESC' },
        });
    }

    private async findOwned(id: string, userId: string): Promise<Transaction> {
        const transaction = await this.transactionsRepository.findOneBy({ id });
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        // Throws ForbiddenException if the farm is not owned by the caller.
        await this.farmsService.verifyOwnership(transaction.farmId, userId);
        return transaction;
    }

    findOne(id: string, userId: string) {
        return this.findOwned(id, userId);
    }

    async update(id: string, updateDto: UpdateTransactionDto, userId: string) {
        await this.findOwned(id, userId);
        // Never allow re-pointing a transaction at a farm the caller does not own.
        if (updateDto.farmId) {
            await this.farmsService.verifyOwnership(updateDto.farmId, userId);
        }
        await this.transactionsRepository.update(id, updateDto);
        return this.transactionsRepository.findOneBy({ id });
    }

    async remove(id: string, userId: string) {
        await this.findOwned(id, userId);
        return this.transactionsRepository.delete(id);
    }

    async getSummaryByFarm(farmId: string, userId: string) {
        await this.farmsService.verifyOwnership(farmId, userId);
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
            totalIncome: Number(income?.total || 0),
            totalExpense: Number(expense?.total || 0),
            netProfit: Number(income?.total || 0) - Number(expense?.total || 0),
        };
    }
}
