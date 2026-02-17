import { apiClient } from './apiClient';
import { Expense } from '../types/database';

export const ExpensesService = {
    async create(data: Partial<Expense>): Promise<Expense> {
        try {
            return await apiClient.post('/expenses', data);
        } catch (error) {
            console.error('Error creating expense record:', error);
            throw error;
        }
    },

    async fetchByCycle(cropId: string): Promise<Expense[]> {
        try {
            return await apiClient.get(`/expenses/cycle/${cropId}`);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            throw error;
        }
    },

    async getCycleFinancials(cropId: string): Promise<any> {
        try {
            return await apiClient.get(`/expenses/cycle/${cropId}/financials`);
        } catch (error) {
            console.error('Error fetching cycle financials:', error);
            throw error;
        }
    }
};
