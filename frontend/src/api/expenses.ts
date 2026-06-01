import apiClient from './client';

export enum ExpenseCategory {
    FEED = 'Feed',
    PROBIOTICS = 'Chemicals/Probiotics',
    SEED = 'Seed (Fry)',
    LABOR = 'Labor',
    ENERGY = 'Energy (Fuel/Electricity)',
    MAINTENANCE = 'Maintenance',
    OTHER = 'Other',
}

export interface Expense {
    id: string;
    cropId?: string | null;
    pondId: string;
    userId: string;
    date: string;
    category: ExpenseCategory;
    amount: number;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpenseDto {
    cropId?: string | null;
    pondId: string;
    date: string;
    category: ExpenseCategory;
    amount: number;
    description?: string;
}

export interface CycleFinancials {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    marginPercent: number;
    // Backend returns a category->amount map, not an array.
    expensesByCategory: Record<string, number>;
}

export const expensesApi = {
    findByCycle: (cropId: string) =>
        apiClient.get<Expense[]>(`/expenses/cycle/${cropId}`),

    create: (data: CreateExpenseDto) =>
        apiClient.post<Expense>('/expenses', data),

    getCycleFinancials: (cropId: string) =>
        apiClient.get<CycleFinancials>(`/expenses/cycle/${cropId}/financials`),
};
