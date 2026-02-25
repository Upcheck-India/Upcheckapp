import apiClient from './client';

export interface DiseaseRecord {
    id: string;
    cropId: string;
    diseaseId: string;
    recordedDate: string;
    severityAtDetection?: string;
    photoUrls?: string[];
    notes?: string;
    createdAt?: string;
}

export interface CreateDiseaseRecordDto {
    cropId: string;
    diseaseId: string;
    recordedDate: string;
    severityAtDetection?: string;
    photoUrls?: string[];
    notes?: string;
}

export const diseaseApi = {
    getAll: () => apiClient.get<DiseaseRecord[]>('/disease/record'),
    create: (data: CreateDiseaseRecordDto) => apiClient.post<DiseaseRecord>('/disease/record', data),
};

