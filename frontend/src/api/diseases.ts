import apiClient from './client';
import i18n from '../i18n';

export interface DiseaseRecord {
    id: string;
    cropId: string;
    diseaseId: string;
    recordedDate: string;
    severityAtDetection?: string;
    photoUrls?: string[];
    notes?: string;
    createdAt?: string;
    /** Server-evaluated at write time (BANNED-1) — never client-set. */
    bannedSubstanceFlag?: 'none' | 'restricted' | 'banned';
    bannedSubstanceMatches?: string[];
    // ── D6 (absent on a backend older than migration 1780701500000) ──
    symptomSigns?: string[];
    severity?: 'mild' | 'moderate' | 'severe' | null;
    affectedPct?: number | string | null;
    confirmedBy?: 'suspected' | 'microscopy' | 'pcr' | 'lab_other' | null;
    confirmedOn?: string | null;
    labName?: string | null;
    outcome?: 'ongoing' | 'recovered' | 'emergency_harvest' | 'crop_lost';
    resolvedOn?: string | null;
    /** Signed, short-lived URLs of `photoUrls` (which are private paths). */
    photoSignedUrls?: string[];
    /** 400px thumbnails of `photoSignedUrls`, same order. */
    photoThumbUrls?: string[];
    /** Joined library row, so History can show the NAME, not the id. */
    disease?: { id: string; name: string } | null;
}

export interface DiseaseLibrary {
    id: string;
    name: string;
    scientificName?: string;
    commonNames?: string[];
    severityLevel?: 'low' | 'medium' | 'high';
    symptoms?: string[];
    preventionMeasures?: string[];
    treatmentRecommendations?: string[];
    imageUrls?: string[];
    description?: string;
}

export interface CreateDiseaseRecordDto {
    cropId: string;
    diseaseId: string;
    recordedDate: string;
    severityAtDetection?: string;
    photoUrls?: string[];
    notes?: string;
    symptomSigns?: string[];
    severity?: string;
    affectedPct?: number;
    confirmedBy?: string;
    confirmedOn?: string;
    labName?: string;
    outcome?: string;
    resolvedOn?: string;
}

export const diseaseApi = {
    getByCrop: (cropId: string) => apiClient.get<DiseaseRecord[]>(`/disease/record/crop/${cropId}`),
    create: (data: CreateDiseaseRecordDto) => apiClient.post<DiseaseRecord>('/disease/record', data),
    update: (id: string, data: Partial<CreateDiseaseRecordDto>) =>
        apiClient.patch<DiseaseRecord>(`/disease/record/${id}`, data),
    remove: (id: string) => apiClient.delete(`/disease/record/${id}`),
    // Disease codes/scientific names never translate (see backend
    // disease-library-translation.entity.ts) — only symptoms/prevention/
    // treatment text does. Pass the app's current language so the backend
    // returns that content pre-translated, falling back to English per-field
    // when a translation is missing; the response shape is unchanged either way.
    getLibrary: () => apiClient.get<DiseaseLibrary[]>('/disease/library', { params: { lang: i18n.language } }),
    getAllDiseases: () => apiClient.get<DiseaseLibrary[]>('/disease/library', { params: { lang: i18n.language } }),
    searchDiseases: (query: string) => apiClient.get<DiseaseLibrary[]>('/disease/library/search', { params: { q: query, lang: i18n.language } }),
    getDiseaseById: (id: string) => apiClient.get<DiseaseLibrary>(`/disease/library/${id}`, { params: { lang: i18n.language } }),
};
