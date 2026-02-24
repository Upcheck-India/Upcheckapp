import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl
    || process.env.EXPO_PUBLIC_API_URL
    || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach auth token
apiClient.interceptors.request.use((config) => {
    // Read directly from the Zustand store
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        // If Supabase handles refresh automatically, we just log out if we get a 401
        // because it means the session is truly dead.
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }

        return Promise.reject(error);
    }
);

export default apiClient;
