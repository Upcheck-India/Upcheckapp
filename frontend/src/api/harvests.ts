import apiClient from './client';

export interface HarvestRecord {
    id: string;
    pondId: string;
    cycleId: string;
    harvestDate: string;
    harvestType: 'partial' | 'final';
    totalBiomassKg: number;
    abw: number;
    survivalRate?: number;
    buyerName?: string;
    pricePerKg?: number;
    notes?: string;
}

export interface CreateHarvestDto {
    pondId: string;
    cycleId: string;
    harvestDate: string;
    harvestType: 'partial' | 'final';
    totalBiomassKg: number;
    abw: number;
    survivalRate?: number;
    buyerName?: string;
    pricePerKg?: number;
    notes?: string;
}

export const harvestsApi = {
    getAll: () => apiClient.get<HarvestRecord[]>('/harvests'),
    create: (data: CreateHarvestDto) => apiClient.post<HarvestRecord>('/harvests', data),
};
