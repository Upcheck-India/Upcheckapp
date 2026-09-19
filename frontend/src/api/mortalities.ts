import apiClient from './client';

export interface MortalityRecord {
    id: string;
    cropId: string;
    recordDate: string;
    quantity: number;
    estimatedWeightKg?: number;
    note?: string;
    images?: string[];
    createdAt?: string;
    /** D6: unknown | low_do | disease | molt | handling | predator | other */
    suspectedCause?: string | null;
    /** Private storage paths; `photoSignedUrls` are their short-lived URLs. */
    photoUrls?: string[];
    photoSignedUrls?: string[];
    /** 400px thumbnails of `photoSignedUrls`, same order. */
    photoThumbUrls?: string[];
}

export interface CreateMortalityRecordDto {
    cropId: string;
    recordDate: string;
    quantity: number;
    estimatedWeightKg?: number;
    note?: string;
    images?: string[];
    suspectedCause?: string;
    photoUrls?: string[];
}

export const mortalityApi = {
    getByCrop: (cropId: string) => apiClient.get<MortalityRecord[]>(`/mortality/crop/${cropId}`),
    create: (data: CreateMortalityRecordDto) => apiClient.post<MortalityRecord>('/mortality', data),
    update: (id: string, data: Partial<CreateMortalityRecordDto>) => apiClient.patch<MortalityRecord>(`/mortality/${id}`, data),
    remove: (id: string) => apiClient.delete<void>(`/mortality/${id}`),
};

