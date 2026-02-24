import apiClient from './client';

export interface Farm {
    id: string;
    name: string;
    farmCode?: string;
    address?: string;
    areaHectares?: number;
    waterSourceType?: string;
    latitude?: number;
    longitude?: number;
    userId: string;
    createdAt: string;
    updatedAt: string;
    ponds?: any[];
}

export interface CreateFarmDto {
    name: string;
    farmCode?: string;
    areaHectares?: number;
    address?: string;
    waterSourceType?: string;
    latitude?: number;
    longitude?: number;
}

export interface UpdateFarmDto extends Partial<CreateFarmDto> { }

export const farmsApi = {
    getAll: () => apiClient.get<Farm[]>('/farms'),

    getById: (id: string) => apiClient.get<Farm>(`/farms/${id}`),

    create: (data: CreateFarmDto) => apiClient.post<Farm>('/farms', data),

    update: (id: string, data: UpdateFarmDto) => apiClient.patch<Farm>(`/farms/${id}`, data),

    delete: (id: string) => apiClient.delete(`/farms/${id}`),
};
