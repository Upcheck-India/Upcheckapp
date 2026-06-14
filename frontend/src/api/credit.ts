import apiClient from './client';

export interface CreditLedger {
  id: string;
  userId: string;
  cropId: string | null;
  dealerName: string;
  principal: number;
  interestPct: number;
  startDate: string;
  dueDate: string | null;
  repaid: number;
  notes: string | null;
  outstanding: number;
  createdAt: string;
}

export interface CreditSummary {
  totalOutstanding: number;
  byDealer: Record<string, number>;
}

export const creditApi = {
  create: (body: {
    dealerName: string;
    principal: number;
    interestPct?: number;
    startDate: string;
    dueDate?: string;
    cropId?: string;
    notes?: string;
  }) => apiClient.post<CreditLedger>('/credit', body),

  list: () => apiClient.get<CreditLedger[]>('/credit'),

  summary: () => apiClient.get<CreditSummary>('/credit/summary'),

  repay: (id: string, amount: number) =>
    apiClient.patch<CreditLedger>(`/credit/${id}/repay`, { amount }),

  reorderCheck: (qty: number, threshold: number, dailyBurn: number, leadTimeDays: number) =>
    apiClient.get<{ daysToRunout: number; reorderNeeded: boolean }>(
      '/credit/reorder-check',
      { params: { qty, threshold, dailyBurn, leadTimeDays } },
    ),
};
