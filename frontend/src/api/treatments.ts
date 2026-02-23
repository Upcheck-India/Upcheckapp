import apiClient from './client';

export interface TreatmentRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    treatmentType: string;
    productName: string;
    dosage: number;
    unit: string;
    applicationMethod: string;
    reason?: string;
    notes?: string;
}

export interface CreateTreatmentRecordDto {
    pondId: string;
    recordedAt: string;
    treatmentType: string;
    productName: string;
    dosage: number;
    unit: string;
    applicationMethod: string;
    reason?: string;
    notes?: string;
}

export const treatmentsApi = {
    getAll: () => apiClient.get<TreatmentRecord[]>('/treatments'),
    create: (data: CreateTreatmentRecordDto) => apiClient.post<TreatmentRecord>('/treatments', data),
};
