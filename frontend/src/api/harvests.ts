import apiClient from './client';

export type HarvestType = 'partial' | 'full';
export type HarvestStatus = 'pending' | 'sold' | 'discarded';

export interface Harvest {
    id: string;
    cropId: string;
    harvestDate: string;
    weightKg: number;
    count?: number | null;
    averageSize?: number | null;
    salePriceTotal?: number | null;
    buyerName?: string | null;
    harvestType: HarvestType;
    status: HarvestStatus;
    notes?: string | null;
    /**
     * Buyer's weighing-slip lines (H1). Empty for an old, ungraded harvest —
     * read it as one implicit line of `weightKg` at `salePriceTotal`. Prices
     * come back null without VIEW_FINANCIALS.
     */
    grades?: HarvestGrade[];
    rejectedKg?: number | null;
    rejectedReason?: RejectedReason | null;
    pieces?: number | null;
    piecesEstimated?: boolean;
    createdAt: string;
    updatedAt: string;
    /** F5: buyer's weighing slip (cap 2, protected 12mo). [] without VIEW_FINANCIALS. */
    photoPaths?: string[];
    /** Signed, short-lived; read side. [] without VIEW_FINANCIALS, same as `photoPaths`. */
    photoSignedUrls?: string[];
    /** 400px thumbnails of `photoSignedUrls`, same order. */
    photoThumbUrls?: string[];
}

export type RejectedReason = 'soft_shell' | 'broken' | 'dead' | 'other';

export interface HarvestGrade {
    id: string;
    countPerKg: number | null;
    weightKg: number;
    pricePerKg: number | null;
}

export interface GradeInput {
    id?: string;
    countPerKg?: number | null;
    weightKg: number;
    pricePerKg?: number | null;
}

/** @deprecated Use Harvest instead */
export type HarvestRecord = Harvest;

export interface CreateHarvestDto {
    cropId: string;
    harvestDate: string;
    /** Ignored by the server when `grades` is sent (it derives the total). */
    weightKg?: number;
    grades?: GradeInput[];
    rejectedKg?: number | null;
    rejectedReason?: RejectedReason | null;
    /** The farmer saw the out-of-band ₹/kg warning and kept the value. */
    confirmOutOfRange?: boolean;
    count?: number;
    averageSize?: number;
    salePriceTotal?: number | null;
    buyerName?: string | null;
    harvestType: HarvestType;
    status?: HarvestStatus;
    notes?: string | null;
    /** F5: buyer's weighing slip (cap 2, protected 12mo). VIEW_FINANCIALS gated. */
    photoPaths?: string[];
}

export const harvestsApi = {
    getAll: (cropId?: string) => apiClient.get<Harvest[]>('/harvests', { params: cropId ? { cropId } : {} }),
    getByCrop: (cropId: string) => apiClient.get<Harvest[]>('/harvests', { params: { cropId } }),
    /**
     * Every harvest on a pond, across all of its crop cycles, newest first.
     *
     * A pond outlives its cycles: after a full harvest closes one, the record of
     * what came out of that pond used to be reachable only per-crop, so nobody
     * could see the pond's own run of harvests. Same DTO as `?cropId=`.
     */
    getByPond: (pondId: string) => apiClient.get<Harvest[]>('/harvests', { params: { pondId } }),
    getById: (id: string) => apiClient.get<Harvest>(`/harvests/${id}`),
    create: (data: CreateHarvestDto) => apiClient.post<Harvest>('/harvests', data),
    update: (id: string, data: Partial<CreateHarvestDto>) => apiClient.patch<Harvest>(`/harvests/${id}`, data),
    delete: (id: string) => apiClient.delete(`/harvests/${id}`),
};
