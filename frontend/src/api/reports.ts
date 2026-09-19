import apiClient from './client';
import { moneyQueryParams, type MoneyFilterParams } from './transactions';

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
    /**
     * The slice of `totalExpenses` that came from inventory purchases. Shown
     * next to the "count inventory purchases" toggle so the farmer can see what
     * the toggle is worth before flipping it.
     *
     * Necessarily 0 when `includeInventoryPurchases=false` — those rows are
     * then not in `totalExpenses` either. Absent on older backends.
     */
    inventoryExpenses?: number;
    /**
     * Per-pond split, each row tagged with whether the pond is ARCHIVED.
     *
     * This is the ONLY honest source of "how much of this came from a retired
     * pond": a transaction hangs off a farm and has no pond at all, so the
     * entry list below cannot answer the question for its own rows.
     */
    ponds?: Array<{
        pondId: string;
        name: string | null;
        archived: boolean;
        revenue: number;
        expenses: number;
    }>;
    /** Whether the figures above actually include archived ponds. */
    includedArchivedPonds?: boolean;
    /**
     * H4: cycles whose sale was booked both by a pre-H4 plan completion (a
     * transaction) and by a harvest — both are in `revenue`. Flagged, never
     * rewritten. Only on /money/overview; absent on older backends.
     */
    possibleDuplicateHarvestIncome?: Array<{ cropId: string; pondId: string }>;
}

export interface CycleAnalysis {
    cycleId: string;
    /** Null when no feed or no harvest was logged — never a fake 0. */
    fcr: number | null;
    totalFeedKg: number;
    totalHarvestKg: number;
    /** Harvested ÷ stocked (not the sampling estimate); null when unknown. */
    survivalRate: number | null;
    growthChart: Array<{ date: string; mbw: number }>;
}

export type Band = 'good' | 'fair' | 'poor';

/** GET /crops/:id/result (harvest-and-molt H3). `null` always means "not logged". */
export interface CycleResult {
    cropId: string;
    pondId: string;
    farmId: string;
    pondName: string;
    status: string;
    closeReason: string | null;
    lost: boolean;
    stockingDate: string | null;
    endDate: string;
    doc: number | null;
    stockedCount: number | null;
    harvestedKg: number;
    yield: { tPerHa: number; areaAssumed: boolean } | null;
    survival: { pct: number; low: number | null; high: number | null; estimated: boolean } | null;
    srBand: Band | null;
    feedKg: number;
    untaggedFeedLogs: number;
    fcr: number | null;
    fcrBand: Band | null;
    avgCount: number | null;
    gradeMix: { countPerKg: number; kg: number; pct: number }[];
    adgGPerDay: number | null;
    stockingAbwAssumedG: number;
    /** Null without VIEW_FINANCIALS. */
    money: { revenue: number; cost: number; profit: number; marginPct: number; breakEvenPricePerKg: number | null } | null;
    nextCycle: { key: 'feedOver' | 'mortalitySpike' | 'softShellMolt'; params: Record<string, string | number> }[];
    welfare: {
        doBelow3Days: { days: number; of: number } | null;
        nh3CriticalDays: { days: number; of: number } | null;
        handlingInMoltPeak: number | null;
        diseases: { recordedDate: string; name: string | null; outcome: string | null }[] | null;
        biosecurity: { done: number; total: number } | null;
        seedPcr: { results: Record<string, string>; date: string | null; spf: boolean | null } | null;
    };
    growthChart: Array<{ date: string; mbw: number }>;
}

export const reportsApi = {
    getDashboardSummary: (farmId?: string) =>
        apiClient.get<DashboardSummary>('/reports/dashboard', { params: farmId ? { farmId } : {} }),

    getFinancialReport: (farmId: string, filters?: MoneyFilterParams) =>
        apiClient.get<FinancialReport>('/reports/financials', {
            params: { farmId, ...moneyQueryParams(filters) },
        }),

    getCycleAnalysis: (cycleId: string) =>
        apiClient.get<CycleAnalysis>(`/reports/cycle/${cycleId}/analysis`),

    getCycleResult: (cropId: string) => apiClient.get<CycleResult>(`/crops/${cropId}/result`),
};