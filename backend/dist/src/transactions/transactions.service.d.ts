import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
export declare class TransactionsService {
    private transactionsRepository;
    constructor(transactionsRepository: Repository<Transaction>);
    create(createDto: CreateTransactionDto): Promise<Transaction>;
    findAll(farmId?: string, type?: string): Promise<Transaction[]>;
    findOne(id: string): Promise<Transaction | null>;
    update(id: string, updateDto: UpdateTransactionDto): Promise<Transaction | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    getSummaryByFarm(farmId: string): Promise<{
        totalIncome: any;
        totalExpense: any;
        netProfit: number;
    }>;
}
