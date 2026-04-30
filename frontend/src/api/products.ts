import apiClient from './client';

export interface Product {
    id: string;
    name: string;
    category: string;
    manufacturer?: string;
    description?: string;
    unit: string;
    createdAt: string;
}

export const productsApi = {
    getAll: () =>
        apiClient.get<Product[]>('/products'),

    getById: (id: string) =>
        apiClient.get<Product>(`/products/${id}`),
};