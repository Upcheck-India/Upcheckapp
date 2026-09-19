import apiClient from './client';

export type BannedFlag = 'none' | 'restricted' | 'banned';

export interface FlagHistoryEntry {
    at: string;
    /** User id, or 'system' when a newer banned list re-flagged the record. */
    by: string;
    from: BannedFlag;
    to: BannedFlag;
    matches: string[];
    listVersion: string;
    reason?: string;
}

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
    /** Server-evaluated at write time (BANNED-1) — never client-set. */
    bannedSubstanceFlag?: BannedFlag;
    bannedSubstanceMatches?: string[];
    // Structured treatment (D2) — absent on rows from older app versions.
    category?: string | null;
    ingredientKeys?: string[] | null;
    productName?: string | null;
    reason?: string | null;
    doseValue?: number | string | null;
    doseUnit?: string | null;
    diseaseRecordId?: string | null;
    flagHistory?: FlagHistoryEntry[];
}

export interface CreateTreatmentDto {
    cropId: string;
    treatmentDate: string;
    description?: string;
    basedOn?: string;
    productId?: string;
    dosageKg?: number;
    notes?: string;
    category?: string;
    ingredientKeys?: string[];
    productName?: string;
    reason?: string;
    doseValue?: number;
    doseUnit?: string;
    diseaseRecordId?: string;
    /** Create only: draw the dose from this inventory item. */
    inventoryItemId?: string;
}

export interface UpdateTreatmentDto extends Partial<Omit<CreateTreatmentDto, 'cropId' | 'inventoryItemId'>> {
    /** Required by the server when the edit lowers the banned flag (REASON_REQUIRED). */
    flagChangeReason?: string;
}

/** An ingredient of the catalogue (GET /treatments/ingredients). */
export interface Ingredient {
    key: string;
    category: string;
    names: Record<'en' | 'hi' | 'te' | 'ta' | 'bn' | 'or', string>;
    aliases: string[];
    bannedKey?: string;
    withdrawalDays?: { value: number; source: { instrument: string; url: string } };
}

export interface IngredientCatalogue {
    version: string;
    categories: string[];
    reasons: string[];
    doseUnits: string[];
    ingredients: Ingredient[];
}

/** GET /crops/:id/compliance — re-evaluated on every read (D3). */
export interface CycleCompliance {
    status: 'none_logged' | 'restricted_logged' | 'banned_logged';
    items: { date: string; source: 'treatment' | 'disease'; recordId: string; substances: string[]; flag: 'restricted' | 'banned' }[];
    listVersion: string;
    evaluatedAt: string;
}

/** @deprecated Use Treatment instead */
export type TreatmentRecord = Treatment;

export const treatmentsApi = {
    getAll: (cropId?: string) => apiClient.get<Treatment[]>('/treatments', { params: cropId ? { cropId } : {} }),
    getByCrop: (cropId: string) => apiClient.get<Treatment[]>('/treatments', { params: { cropId } }),
    getById: (id: string) => apiClient.get<Treatment>(`/treatments/${id}`),
    create: (data: CreateTreatmentDto) => apiClient.post<Treatment>('/treatments', data),
    update: (id: string, data: UpdateTreatmentDto) => apiClient.patch<Treatment>(`/treatments/${id}`, data),
    delete: (id: string) => apiClient.delete(`/treatments/${id}`),
    ingredients: () => apiClient.get<IngredientCatalogue>('/treatments/ingredients'),
    compliance: (cropId: string) => apiClient.get<CycleCompliance>(`/crops/${cropId}/compliance`),
};
