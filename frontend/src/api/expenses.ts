import apiClient from './client';

export interface Expense {
    id: string;
    farmId?: string;
    pondId?: string;
    cropId?: string;
    category: string;
    amount: number;
    description?: string;
    expenseDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpenseDto {
    farmId?: string;
    pondId?: string;
    cropId?: string;
    category: string;
    amount: number;
    description?: string;
    expenseDate: string;
}

export const expensesApi = {
    findByCycle: (cropId: string) =>
        apiClient.get<Expense[]>(`/expenses/cycle/${cropId}`),

    getById: (id: string) =>
        apiClient.get<Expense>(`/expenses/${id}`),

    create: (data: CreateExpenseDto) =>
        apiClient.post<Expense>('/expenses', data),

    getCycleFinancials: (cropId: string) =>
        apiClient.get(`/expenses/cycle/${cropId}/financials`),
};