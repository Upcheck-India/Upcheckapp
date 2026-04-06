import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
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
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Token refresh machinery ──
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token!);
        }
    });
    failedQueue = [];
};

// Response interceptor — handle 401 with refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Only handle 401s, and don't retry if already retried
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Don't try to refresh auth endpoints themselves
        const url = originalRequest.url || '';
        if (url.includes('/auth/')) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            // Another request is already refreshing — queue this one
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return apiClient(originalRequest);
            }).catch((err) => {
                return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const session = useAuthStore.getState().session;
            if (!session?.refresh_token) {
                throw new Error('No refresh token available');
            }

            // Call the refresh endpoint
            const { data } = await axios.post(`${API_URL}/auth/supabase/refresh`, {
                refreshToken: session.refresh_token,
            });

            const newSession = data.session;
            if (!newSession?.access_token) {
                throw new Error('Refresh response missing access token');
            }

            // Update the store with new session
            useAuthStore.getState().setSession(newSession);

            // Process queued requests with new token
            processQueue(null, newSession.access_token);

            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${newSession.access_token}`;
            return apiClient(originalRequest);
        } catch (refreshError) {
            // Refresh failed — clear everything and log out
            processQueue(refreshError, null);
            useAuthStore.getState().clearSession();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default apiClient;
