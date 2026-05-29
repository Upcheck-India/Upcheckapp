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
    createdAt: string;
    updatedAt: string;
}

/** @deprecated Use Harvest instead */
export type HarvestRecord = Harvest;

export interface CreateHarvestDto {
    cropId: string;
    harvestDate: string;
    weightKg: number;
    count?: number;
    averageSize?: number;
    salePriceTotal?: number;
    buyerName?: string;
    harvestType: HarvestType;
    status?: HarvestStatus;
    notes?: string;
}

export const harvestsApi = {
    getAll: (cropId?: string) => apiClient.get<Harvest[]>('/harvests', { params: cropId ? { cropId } : {} }),
    getByCrop: (cropId: string) => apiClient.get<Harvest[]>('/harvests', { params: { cropId } }),
    getById: (id: string) => apiClient.get<Harvest>(`/harvests/${id}`),
    create: (data: CreateHarvestDto) => apiClient.post<Harvest>('/harvests', data),
    delete: (id: string) => apiClient.delete(`/harvests/${id}`),
};
