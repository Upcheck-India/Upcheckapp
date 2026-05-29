import apiClient from './client';

export interface FeedProduct {
    id: string;
    brand: string;
    code: string;
    name?: string;
    type?: string;
    sizeRangeMm?: string;
    proteinPercent?: number;
    createdAt: string;
}

export interface CreateFeedProductDto {
    brand: string;
    code: string;
    name?: string;
    type?: string;
    sizeRangeMm?: string;
    proteinPercent?: number;
}

export interface UpdateFeedProductDto extends Partial<CreateFeedProductDto> {}

export const feedProductsApi = {
    getAll: () =>
        apiClient.get<FeedProduct[]>('/feed-products'),

    getById: (id: string) =>
        apiClient.get<FeedProduct>(`/feed-products/${id}`),

    create: (data: CreateFeedProductDto) =>
        apiClient.post<FeedProduct>('/feed-products', data),

    update: (id: string, data: UpdateFeedProductDto) =>
        apiClient.patch<FeedProduct>(`/feed-products/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/feed-products/${id}`),
};
