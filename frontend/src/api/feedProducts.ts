import apiClient from './client';

export interface FeedProduct {
    id: string;
    name: string;
    brand?: string;
    type: string;
    proteinContent?: number;
    description?: string;
    createdAt: string;
}

export const feedProductsApi = {
    getAll: () =>
        apiClient.get<FeedProduct[]>('/feed-products'),

    getById: (id: string) =>
        apiClient.get<FeedProduct>(`/feed-products/${id}`),
};