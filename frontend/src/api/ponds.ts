import apiClient from './client';

export interface Pond {
    id: string;
    farmId: string;
    name: string;
    shape: 'rectangular' | 'circular';
    length?: number;
    width?: number;
    diameter?: number;
    depth?: number;
    areaMm?: number;
    type: string;
    status: 'active' | 'idle' | 'maintenance';
    isArchived: boolean;
    activeCycleId?: string | null;
    createdAt: string;
    updatedAt: string;
    farm?: any;
    activeCycle?: any;
}

export interface CreatePondDto {
    farmId: string;
    name: string;
    type: string;
    shape: 'rectangular' | 'circular';
    length?: number;
    width?: number;
    diameter?: number;
    depth?: number;
    status?: string;
}

export interface UpdatePondDto extends Partial<Omit<CreatePondDto, 'farmId'>> { }

export const pondsApi = {
    getAll: (farmId: string, params?: { status?: string; search?: string; sort?: string; includeArchived?: boolean; page?: number; take?: number }) =>
        apiClient.get<any>(`/ponds`, { params: { farmId, ...params } }),

    getMine: () => apiClient.get<Pond[]>('/ponds/mine'),

    getById: (id: string) => apiClient.get<Pond>(`/ponds/${id}`),

    create: (data: CreatePondDto) => apiClient.post<Pond>('/ponds', data),

    update: (id: string, data: UpdatePondDto) => apiClient.patch<Pond>(`/ponds/${id}`, data),

    archive: (id: string) => apiClient.patch(`/ponds/${id}/archive`),

    delete: (id: string) => apiClient.delete(`/ponds/${id}`),

    getDimensionHistory: (id: string, params?: { page?: number; take?: number }) =>
        apiClient.get<any>(`/ponds/${id}/dimension-history`, { params }),
};
