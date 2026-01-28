import { Farm } from '../farms/farm.entity';
export declare class Transaction {
    id: string;
    farmId: string;
    farm: Farm;
    createdAt: Date;
    transactionDate: Date;
    type: string;
    category: string;
    amount: number;
    description: string;
    paymentMethod: string;
    referenceNumber: string;
}
