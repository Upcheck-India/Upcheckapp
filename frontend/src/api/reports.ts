import apiClient from './client';

export interface DashboardSummary {
    activePondsCount: number;
    totalPondsCount: number;
    lowStockAlerts: number;
    todayFeedUsage: number;
}

export const reportsApi = {
    getDashboardSummary: (farmId?: string) =>
        apiClient.get<DashboardSummary>('/reports/dashboard', { params: farmId ? { farmId } : {} }),
};
