import apiClient from './client';

export interface SamplingRecord {
    id: string;
    pondId: string;
    cropId?: string;
    samplingDate: string;
    mbwG?: number;
    totalSamples?: number;
    stdDeviation?: number;
    biomassEstimationKg?: number;
    srEstimationPercent?: number;
    notes?: string;
    photoUrls?: string[];
    createdAt?: string;
}

export interface CreateSamplingDto {
    pondId: string;
    cropId?: string;
    samplingDate: string;
    mbwG?: number;
    totalSamples?: number;
    stdDeviation?: number;
    biomassEstimationKg?: number;
    srEstimationPercent?: number;
    notes?: string;
    photoUrls?: string[];
}

export const samplingApi = {
    getAll: (cropId?: string) => apiClient.get<SamplingRecord[]>('/sampling', { params: cropId ? { cropId } : {} }),
    getByCrop: (cropId: string) => apiClient.get<SamplingRecord[]>('/sampling', { params: { cropId } }),
    create: (data: CreateSamplingDto) => apiClient.post<SamplingRecord>('/sampling', data),
    update: (id: string, data: Partial<CreateSamplingDto>) => apiClient.patch<SamplingRecord>(`/sampling/${id}`, data),
    remove: (id: string) => apiClient.delete<void>(`/sampling/${id}`),
};
