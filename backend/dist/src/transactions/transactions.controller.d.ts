import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    create(createDto: CreateTransactionDto): Promise<import("./transaction.entity").Transaction>;
    findAll(farmId?: string, type?: string): Promise<import("./transaction.entity").Transaction[]>;
    getSummary(farmId: string): Promise<{
        totalIncome: any;
        totalExpense: any;
        netProfit: number;
    }>;
    findOne(id: string): Promise<import("./transaction.entity").Transaction | null>;
    update(id: string, updateDto: UpdateTransactionDto): Promise<import("./transaction.entity").Transaction | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
