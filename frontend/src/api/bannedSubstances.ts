import apiClient from './client';
import type { BannedSubstance } from '../features/bannedSubstances';

export interface BannedListResponse {
    version: string;
    substances: BannedSubstance[];
}

/** Fetch the authoritative, server-updatable banned-substance list (BANNED-1). */
export const fetchBannedSubstances = async (): Promise<BannedListResponse> => {
    const { data } = await apiClient.get<BannedListResponse>('/banned-substances');
    return data;
};
