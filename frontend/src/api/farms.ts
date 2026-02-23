import apiClient from './client';

export interface Farm {
    id: string;
    name: string;
    location?: string;
    totalAreaMm?: number;
    userId: string;
    createdAt: string;
    updatedAt: string;
    ponds?: any[]; // To be fleshed out when joined
}

export interface CreateFarmDto {
    name: string;
    location?: string;
    totalAreaMm?: number;
}

export interface UpdateFarmDto extends Partial<CreateFarmDto> { }

export const farmsApi = {
    getAll: () => apiClient.get<Farm[]>('/farms'),

    getById: (id: string) => apiClient.get<Farm>(`/farms/${id}`),

    create: (data: CreateFarmDto) => apiClient.post<Farm>('/farms', data),

    update: (id: string, data: UpdateFarmDto) => apiClient.patch<Farm>(`/farms/${id}`, data),

    delete: (id: string) => apiClient.delete(`/farms/${id}`),
};
