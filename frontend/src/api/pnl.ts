import apiClient from './client';

export interface CropPnl {
  cropId: string;
  totalCost: number;
  costBreakdown: Record<string, number>;
  revenue: number;
  harvestBiomassKg: number;
  coPerKg: number;
  breakEvenCount: number | null;
  profit: number;
  marginPct: number;
  roiPct: number;
  productivityTPerHa: number | null;
  harvestComplete: boolean;
}

export const pnlApi = {
  /** Crop P&L: CoP/kg, break-even count, profit/margin/ROI, t/ha. */
  cropPnl: (cropId: string, opts?: { region?: string; areaM2?: number }) =>
    apiClient.get<CropPnl>(`/pnl/crop/${cropId}`, {
      params: {
        ...(opts?.region ? { region: opts.region } : {}),
        ...(opts?.areaM2 ? { areaM2: opts.areaM2 } : {}),
      },
    }),
};
