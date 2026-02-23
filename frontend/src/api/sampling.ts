import apiClient from './client';

export interface SamplingRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    averageWeightG: number;
    averageLengthCm?: number;
    survivalRate?: number;
    totalBiomassKg?: number;
    healthStatus?: string;
    notes?: string;
}

export interface CreateSamplingRecordDto {
    pondId: string;
    recordedAt: string;
    averageWeightG: number;
    averageLengthCm?: number;
    survivalRate?: number;
    totalBiomassKg?: number;
    healthStatus?: string;
    notes?: string;
}

export const samplingApi = {
    getAll: () => apiClient.get<SamplingRecord[]>('/samplings'),
    create: (data: CreateSamplingRecordDto) => apiClient.post<SamplingRecord>('/samplings', data),
};
