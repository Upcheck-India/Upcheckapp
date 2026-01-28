import { apiClient } from './apiClient';

export const CalculatorsService = {
    calculateCultivationPerformance: async (data: {
        dailyFeed: number;
        fr: number;
        abw: number;
        cumulativeFeed: number;
        initialStocking: number;
    }) => {
        return apiClient.post('/shrimp-calculations/cultivation-performance', data);
    },

    calculateFreeAmmonia: async (data: {
        tan: number;
        ph: number;
        temperature: number;
    }) => {
        return apiClient.post('/shrimp-calculations/free-ammonia', data);
    },

    calculateProductDosage: async (data: {
        pondArea: number;
        waterLevel: number;
        dosage: number;
    }) => {
        return apiClient.post('/shrimp-calculations/product-amount', data);
    }
};
