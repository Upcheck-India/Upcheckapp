export interface HarvestPlan {
    id: string;
    pond_id: string;
    crop_id?: string | null;
    planned_harvest_date?: string | null;
    target_weight_kg?: number | null;
    expected_price_per_kg?: number | null;
    expected_revenue?: number | null;
    actual_harvest_date?: string | null;
    actual_weight_kg?: number | null;
    actual_price_per_kg?: number | null;
    actual_revenue?: number | null;
    notes?: string | null;
    status: 'planned' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
}

export interface HarvestCycleSummary {
    pondId: string;
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    latestPlan?: HarvestPlan | null;
}
