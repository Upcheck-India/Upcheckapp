import apiClient from './client';

export interface DiseaseRecord {
    id: string;
    pondId: string;
    recordedAt: string;
    diseaseName: string;
    symptoms: string;
    severity: string;
    mortalityRate?: number;
    actionTaken?: string;
}

export const diseaseApi = {
    create: (data: Partial<DiseaseRecord>) => apiClient.post<DiseaseRecord>('/diseases', data),
};
