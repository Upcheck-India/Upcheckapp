import { apiClient } from './apiClient';

export interface DashboardSummary {
    activePondsCount: number;
    totalPondsCount: number;
    lowStockAlerts: number;
    todayFeedUsage: number;
}

export interface CycleAnalysis {
    cycleId: string;
    fcr: number;
    survivalRate: number;
    growthChart: { date: string; mbw: number }[];
}

export interface FinancialReport {
    revenue: number;
    totalExpenses: number;
    profit: number;
    expensesByCategory: { category: string; amount: number }[];
}

export const ReportsService = {
    async getDashboardSummary(farmId?: string): Promise<DashboardSummary> {
        const params = new URLSearchParams();
        if (farmId) params.append('farmId', farmId);
        const response = await apiClient.get(`/reports/dashboard?${params.toString()}`);
        return response.data;
    },

    async getCycleAnalysis(cycleId: string): Promise<CycleAnalysis> {
        const response = await apiClient.get(`/reports/cycle/${cycleId}/analysis`);
        return response.data;
    },

    async getFinancialReport(farmId: string): Promise<FinancialReport> {
        const response = await apiClient.get(`/reports/financials?farmId=${farmId}`);
        return response.data;
    }
};
