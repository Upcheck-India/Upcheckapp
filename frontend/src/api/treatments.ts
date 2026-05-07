import apiClient from './client';

export interface Treatment {
    id: string;
    cropId: string;
    treatmentDate: string;
    basedOn?: string;
    description: string;
    productId?: string | null;
    dosageKg?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTreatmentDto {
    cropId: string;
    treatmentDate: string;
    description: string;
    basedOn?: string;
    productId?: string;
    dosageKg?: number;
    notes?: string;
}

export interface UpdateTreatmentDto extends Partial<Omit<CreateTreatmentDto, 'cropId'>> {}

/** @deprecated Use Treatment instead */
export type TreatmentRecord = Treatment;

export const treatmentsApi = {
    getAll: (cropId?: string) =>
        apiClient.get<Treatment[]>('/treatments', { params: cropId ? { cropId } : {} }),

    getById: (id: string) =>
        apiClient.get<Treatment>(`/treatments/${id}`),

    create: (data: CreateTreatmentDto) =>
        apiClient.post<Treatment>('/treatments', data),

    update: (id: string, data: UpdateTreatmentDto) =>
        apiClient.patch<Treatment>(`/treatments/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/treatments/${id}`),
};
