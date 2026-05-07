import apiClient from './client';

export interface TreatmentRecord {
    id: string;
    cropId: string;
    treatmentDate: string;
    basedOn?: string;
    description: string;
    productId?: string;
    dosageKg?: number;
    notes?: string;
    createdAt?: string;
}

export interface CreateTreatmentDto {
    cropId: string;
    treatmentDate: string;
    description: string;
    basedOn?: string;
    productId?: string;
    dosageKg?: number;
    notes?: string;
}

export const treatmentsApi = {
    getAll: (cropId?: string) => apiClient.get<TreatmentRecord[]>('/treatments', { params: cropId ? { cropId } : {} }),
    getByCrop: (cropId: string) => apiClient.get<TreatmentRecord[]>('/treatments', { params: { cropId } }),
    create: (data: CreateTreatmentDto) => apiClient.post<TreatmentRecord>('/treatments', data),
};
