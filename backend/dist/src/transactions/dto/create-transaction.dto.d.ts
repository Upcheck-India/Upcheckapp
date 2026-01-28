export declare class CreateTransactionDto {
    farmId: string;
    transactionDate: string;
    type: string;
    category: string;
    amount: number;
    description?: string;
    paymentMethod?: string;
    referenceNumber?: string;
}
