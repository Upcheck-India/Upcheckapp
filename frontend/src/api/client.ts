import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl
    || process.env.EXPO_PUBLIC_API_URL
    || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach auth token
apiClient.interceptors.request.use(async (config) => {
    try {
        const session = await AsyncStorage.getItem('supabase_session');
        if (session) {
            const { access_token } = JSON.parse(session);
            if (access_token) {
                config.headers.Authorization = `Bearer ${access_token}`;
            }
        }
    } catch {
        // Silently fail — no token available
    }
    return config;
});

// Response interceptor — handle 401 and refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const session = await AsyncStorage.getItem('supabase_session');
                if (session) {
                    const { refresh_token } = JSON.parse(session);
                    const { data } = await axios.post(`${API_URL}/auth/supabase/refresh`, {
                        refreshToken: refresh_token,
                    });

                    if (data.session) {
                        await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
                        originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
                        return apiClient(originalRequest);
                    }
                }
            } catch {
                // Refresh failed — force logout
                await AsyncStorage.removeItem('supabase_session');
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
