import apiClient from './client';

export interface Product {
    id: string;
    name: string;
    description?: string;
    category: string;
    price: number;
    salePrice?: number;
    imageUrl?: string;
    stock: number;
    sku?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductDto {
    name: string;
    description?: string;
    category: string;
    price: number;
    salePrice?: number;
    imageUrl?: string;
    stock?: number;
    sku?: string;
    isActive?: boolean;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export const productsApi = {
    getAll: (category?: string) =>
        apiClient.get<Product[]>('/products', { params: category ? { category } : {} }),

    getById: (id: string) =>
        apiClient.get<Product>(`/products/${id}`),

    create: (data: CreateProductDto) =>
        apiClient.post<Product>('/products', data),

    update: (id: string, data: UpdateProductDto) =>
        apiClient.patch<Product>(`/products/${id}`, data),

    updateStock: (id: string, quantity: number) =>
        apiClient.patch(`/products/${id}/stock`, { quantity }),

    delete: (id: string) =>
        apiClient.delete(`/products/${id}`),
};
