import apiClient from './client';

export interface MortalityRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    estimatedCount: number;
    averageWeightG?: number;
    totalEstimatedWeightKg?: number;
    notes?: string;
}

export interface CreateMortalityRecordDto {
    pondId: string;
    recordedAt: string;
    estimatedCount: number;
    averageWeightG?: number;
    totalEstimatedWeightKg?: number;
    notes?: string;
}

export const mortalityApi = {
    create: (data: CreateMortalityRecordDto) => apiClient.post<MortalityRecord>('/mortalities', data),
};
