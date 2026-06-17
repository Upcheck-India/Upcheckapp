import apiClient from './client';

export interface DashboardSummary {
    activePondsCount: number;
    totalPondsCount: number;
    lowStockAlerts: number;
    todayFeedUsage: number;
}

export interface FinancialReport {
    revenue: number;
    totalExpenses: number;
    profit: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
}

export interface CycleAnalysis {
    cycleId: string;
    fcr: number;
    totalFeedKg: number;
    totalHarvestKg: number;
    survivalRate: number;
    growthChart: Array<{ date: string; mbw: number }>;
}

export const reportsApi = {
    getDashboardSummary: (farmId?: string) =>
        apiClient.get<DashboardSummary>('/reports/dashboard', { params: farmId ? { farmId } : {} }),

    getFinancialReport: (farmId: string) =>
        apiClient.get<FinancialReport>('/reports/financials', { params: { farmId } }),

    getCycleAnalysis: (cycleId: string) =>
        apiClient.get<CycleAnalysis>(`/reports/cycle/${cycleId}/analysis`),
};