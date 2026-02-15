import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = 'http://localhost:3000'; // Replace with your actual backend URL

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add access token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // effective status code for expired token (401)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await AsyncStorage.getItem('refreshToken');
                if (!refreshToken) {
                    // No refresh token, logout logic should be triggered
                    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
                    return Promise.reject(error);
                }

                const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
                    refreshToken,
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;

                await AsyncStorage.setItem('accessToken', accessToken);
                // Refresh token rotation
                if (newRefreshToken) {
                    await AsyncStorage.setItem('refreshToken', newRefreshToken);
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout user
                await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
