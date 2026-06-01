import apiClient from './client';

export interface MortalityRecord {
    id: string;
    cropId: string;
    recordDate: string;
    quantity: number;
    estimatedWeightKg?: number;
    note?: string;
    images?: string[];
    createdAt?: string;
}

export interface CreateMortalityRecordDto {
    cropId: string;
    recordDate: string;
    quantity: number;
    estimatedWeightKg?: number;
    note?: string;
    images?: string[];
}

export const mortalityApi = {
    getByCrop: (cropId: string) => apiClient.get<MortalityRecord[]>(`/mortality/crop/${cropId}`),
    create: (data: CreateMortalityRecordDto) => apiClient.post<MortalityRecord>('/mortality', data),
    update: (id: string, data: Partial<CreateMortalityRecordDto>) => apiClient.patch<MortalityRecord>(`/mortality/${id}`, data),
    remove: (id: string) => apiClient.delete<void>(`/mortality/${id}`),
};

