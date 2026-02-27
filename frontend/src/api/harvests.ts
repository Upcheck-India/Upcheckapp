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
    getAll: () => apiClient.get<HarvestRecord[]>('/harvests'),
    create: (data: CreateHarvestDto) => apiClient.post<HarvestRecord>('/harvests', data),
};
