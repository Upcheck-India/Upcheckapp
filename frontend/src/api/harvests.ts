import apiClient from './client';

export interface HarvestRecord {
    id: string;
    cropId: string;
    harvestDate: string;
    weightKg: number;
    count?: number;
    averageSize?: number;
    salePriceTotal?: number;
    buyerName?: string;
    harvestType: 'partial' | 'full';
    status?: 'pending' | 'sold' | 'discarded';
    notes?: string;
    createdAt?: string;
}

export interface CreateHarvestDto {
    cropId: string;
    harvestDate: string;
    weightKg: number;
    count?: number;
    averageSize?: number;
    salePriceTotal?: number;
    buyerName?: string;
    harvestType: 'partial' | 'full';
    status?: 'pending' | 'sold' | 'discarded';
    notes?: string;
}

export const harvestsApi = {
    getAll: (cropId?: string) => apiClient.get<HarvestRecord[]>('/harvests', { params: cropId ? { cropId } : {} }),
    getByCrop: (cropId: string) => apiClient.get<HarvestRecord[]>('/harvests', { params: { cropId } }),
    create: (data: CreateHarvestDto) => apiClient.post<HarvestRecord>('/harvests', data),
};
