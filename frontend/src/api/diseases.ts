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

export interface DiseaseLibrary {
    id: string;
    name: string;
    scientificName?: string;
    commonNames?: string[];
    severity?: 'low' | 'medium' | 'high';
    symptoms?: string[];
    preventionMeasures?: string[];
    treatmentRecommendations?: string[];
    imageUrls?: string[];
    description?: string;
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
    getByCrop: (cropId: string) => apiClient.get<DiseaseRecord[]>(`/disease/record/crop/${cropId}`),
    create: (data: CreateDiseaseRecordDto) => apiClient.post<DiseaseRecord>('/disease/record', data),
    getLibrary: () => apiClient.get<DiseaseLibrary[]>('/disease/library'),
    getAllDiseases: () => apiClient.get<DiseaseLibrary[]>('/disease/library'),
    searchDiseases: (query: string) => apiClient.get<DiseaseLibrary[]>('/disease/library/search', { params: { q: query } }),
    getDiseaseById: (id: string) => apiClient.get<DiseaseLibrary>(`/disease/library/${id}`),
};
