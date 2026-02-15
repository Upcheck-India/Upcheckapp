import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../services/api'; // Correct import path
import { User, AuthState, LoginResponse } from '../types/auth';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType extends AuthState {
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    });

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            const userStr = await AsyncStorage.getItem('user');

            if (token && userStr) {
                setState({
                    user: JSON.parse(userStr),
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.error('Check auth error:', error);
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    };

    const handleGoogleLogin = async (idToken: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const response = await api.post<LoginResponse>('/auth/google', { idToken });
            const { user, accessToken, refreshToken } = response.data;

            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            setState({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            console.error('Google backend auth error:', error);
            setState((prev) => ({ ...prev, isLoading: false }));
            alert('Google authentication failed');
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            handleGoogleLogin(id_token);
        }
    }, [response, handleGoogleLogin]); // Added handleGoogleLogin to dependencies

    const login = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const response = await api.post<LoginResponse>('/auth/login', data);
            const { user, accessToken, refreshToken } = response.data;

            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            setState({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    const register = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            // Assuming RegisterResponse is similar to LoginResponse or LoginResponse is intended
            const response = await api.post<LoginResponse>('/auth/register', data);
            const { user, accessToken, refreshToken } = response.data;

            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            setState({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        try {
            await promptAsync();
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken }).catch(() => { });
            }
        } finally {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                register,
                logout,
                signInWithGoogle,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
