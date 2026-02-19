import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { api } from '../services/api'; // Correct import path
import { User, AuthState, LoginResponse } from '../types/auth';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType extends AuthState {
    login: (data: any) => Promise<any>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    linkGoogle: () => Promise<void>;
    checkAuth: () => Promise<void>;
    logoutAllDevices: () => Promise<void>;
    loginWith2FA: (tempToken: string, code: string) => Promise<void>;
    requestOtpLogin: (email: string) => Promise<any>;
    verifyOtpLogin: (email: string, otp: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    const [isLinking, setIsLinking] = useState(false);

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

            if (user && accessToken && refreshToken) {
                await AsyncStorage.setItem('accessToken', accessToken);
                await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('user', JSON.stringify(user));

                setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                throw new Error('Invalid Google login response');
            }
        } catch (error: any) {
            console.error('Google backend auth error:', error);
            setState((prev) => ({ ...prev, isLoading: false }));
            if (error.response && error.response.status === 409) {
                alert('Account exists with this email. Please log in with password and link Google account from settings.');
            } else {
                alert('Google authentication failed');
            }
        }
    };

    const handleLinkGoogle = async (idToken: string) => {
        setIsLinking(false); // Reset state
        try {
            await api.post('/auth/google/link', { idToken });
            alert('Google account linked successfully!');
            // Optionally refresh user profile to get the googleId
            // checkAuth(); // Or manually update state
        } catch (error: any) {
            console.error('Link Google error:', error);
            if (error.response && error.response.status === 409) {
                alert('This Google account is already linked to another user.');
            } else {
                alert('Failed to link Google account.');
            }
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            if (id_token) {
                if (isLinking) {
                    handleLinkGoogle(id_token);
                } else {
                    handleGoogleLogin(id_token);
                }
            }
        } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
            setIsLinking(false); // Reset if cancelled
        }
    }, [response, handleGoogleLogin]); // Added handleGoogleLogin to dependencies

    const login = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const response = await api.post<LoginResponse>('/auth/login', data);

            if (response.data.requires2fa) {
                setState((prev) => ({ ...prev, isLoading: false }));
                return response.data;
            }

            const { user, accessToken, refreshToken } = response.data;

            if (user && accessToken && refreshToken) {
                await AsyncStorage.setItem('accessToken', accessToken);
                await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('user', JSON.stringify(user));

                setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                throw new Error("Invalid login response");
            }
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    const register = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            // Ensure data matches backend DTO: { email, username, password, firstName, lastName, phoneNumber? }
            const response = await api.post<LoginResponse>('/auth/register', data);
            const { user, accessToken, refreshToken } = response.data;

            if (user && accessToken && refreshToken) {
                await AsyncStorage.setItem('accessToken', accessToken);
                await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('user', JSON.stringify(user));

                setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                throw new Error("Invalid register response");
            }
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        setIsLinking(false);
        try {
            await promptAsync();
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    };

    const linkGoogle = async () => {
        setIsLinking(true);
        try {
            await promptAsync();
        } catch (error) {
            console.error('Google link error:', error);
            setIsLinking(false);
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

    const logoutAllDevices = async () => {
        try {
            await api.post('/auth/logout-all');
        } finally {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    };

    const loginWith2FA = async (tempToken: string, code: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const response = await api.post<LoginResponse>('/auth/2fa/login', { tempToken, token: code });
            const { user, accessToken, refreshToken } = response.data;

            if (user && accessToken && refreshToken) {
                await AsyncStorage.setItem('accessToken', accessToken);
                await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('user', JSON.stringify(user));

                setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                throw new Error('Invalid 2FA login response');
            }
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    const requestOtpLogin = async (email: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const response = await api.post('/auth/login/otp/request', { email });
            setState((prev) => ({ ...prev, isLoading: false }));
            return response.data;
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    const verifyOtpLogin = async (email: string, otp: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const response = await api.post<LoginResponse>('/auth/login/otp/verify', { email, otp });
            const { user, accessToken, refreshToken } = response.data;

            if (user && accessToken && refreshToken) {
                await AsyncStorage.setItem('accessToken', accessToken);
                await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('user', JSON.stringify(user));

                setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                throw new Error('Invalid OTP login response');
            }
        } catch (error) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                register,
                logout,
                logoutAllDevices,
                signInWithGoogle,
                linkGoogle,
                checkAuth,
                loginWith2FA,
                requestOtpLogin,
                verifyOtpLogin,
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
