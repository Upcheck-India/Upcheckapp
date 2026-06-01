import apiClient from './client';

export interface Transaction {
    id: string;
    farmId: string;
    transactionDate: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    createdAt: string;
}

export interface CreateTransactionDto {
    farmId: string;
    transactionDate: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string;
    paymentMethod?: string;
    referenceNumber?: string;
}

export interface UpdateTransactionDto {
    transactionDate?: string;
    type?: 'income' | 'expense';
    category?: string;
    amount?: number;
    description?: string;
    paymentMethod?: string;
    referenceNumber?: string;
}

export interface TransactionSummary {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
}

export const transactionsApi = {
    getAll: (farmId?: string, type?: 'income' | 'expense') => {
        const params: Record<string, string> = {};
        if (farmId) params.farmId = farmId;
        if (type) params.type = type;
        return apiClient.get<Transaction[]>('/transactions', { params });
    },

    getSummary: (farmId: string) =>
        apiClient.get<TransactionSummary>(`/transactions/farm/${farmId}/summary`),

    getById: (id: string) =>
        apiClient.get<Transaction>(`/transactions/${id}`),

    create: (data: CreateTransactionDto) =>
        apiClient.post<Transaction>('/transactions', data),

    update: (id: string, data: UpdateTransactionDto) =>
        apiClient.patch<Transaction>(`/transactions/${id}`, data),

    remove: (id: string) =>
        apiClient.delete<void>(`/transactions/${id}`),
};
