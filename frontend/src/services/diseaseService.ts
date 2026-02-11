import { apiClient } from './apiClient';

export const DiseaseService = {
    // Library
    getDiseaseLibrary: async () => {
        return apiClient.get('/disease/library');
    },
    getDiseaseDetail: async (id: string) => {
        return apiClient.get(`/disease/library/${id}`);
    },

    // Records
    recordDisease: async (data: any) => {
        return apiClient.post('/disease/record', data);
    },
    getDiseaseRecords: async (cropId: string) => {
        return apiClient.get(`/disease/record/crop/${cropId}`);
    }
};
