import { Config } from '../constants/Config';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = Config.API_BASE_URL;

export const getAuthHeaders = async () => {
    // Use the Custom JWT from our Auth Store (Backend issued)
    // We access the store state directly outside of React components
    const token = useAuthStore.getState().accessToken;

    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

export const apiClient = {
    get: async (endpoint: string) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers,
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    },

    post: async (endpoint: string, body: any) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    },

    patch: async (endpoint: string, body: any) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    },

    delete: async (endpoint: string) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json(); // Backend delete usually returns result or void, ensure JSON is returned
    }
};
