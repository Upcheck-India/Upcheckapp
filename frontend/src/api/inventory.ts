import apiClient from './client';

export interface InventoryItem {
    id: string;
    farmId: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minStockThreshold: number;
    lastPurchaseDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateInventoryItemDto {
    farmId: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minStockThreshold?: number;
    notes?: string;
}

export interface UpdateInventoryItemDto {
    name?: string;
    currentStock?: number;
    minStockThreshold?: number;
    notes?: string;
}

export const inventoryApi = {
    getAll: (farmId: string) =>
        apiClient.get<InventoryItem[]>('/inventory', { params: { farmId } }),

    getById: (id: string) =>
        apiClient.get<InventoryItem>(`/inventory/${id}`),

    create: (data: CreateInventoryItemDto) =>
        apiClient.post<InventoryItem>('/inventory', data),

    update: (id: string, data: UpdateInventoryItemDto) =>
        apiClient.patch<InventoryItem>(`/inventory/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/inventory/${id}`),

    adjustStock: (id: string, adjustment: number, reason?: string) =>
        apiClient.patch(`/inventory/${id}/adjust`, { adjustment, reason }),

    getLowStock: (farmId: string) =>
        apiClient.get<InventoryItem[]>(`/inventory/low-stock/${farmId}`),
};