import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, AuthSession } from '../api/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

interface AuthState {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: any | null;
    session: AuthSession | null;
    error: string | null;

    // Actions
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    googleLogin: () => Promise<void>;
    signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    session: null,
    error: null,

    initialize: async () => {
        try {
            const sessionStr = await AsyncStorage.getItem('supabase_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                // Verify the token is still valid
                try {
                    const { data } = await authApi.getCurrentUser();
                    set({ isAuthenticated: true, user: data.user, session, isLoading: false });
                } catch {
                    // Token expired — try refresh
                    try {
                        const { data } = await authApi.refresh(session.refresh_token);
                        if (data.session) {
                            await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
                            set({ isAuthenticated: true, user: data.user, session: data.session, isLoading: false });
                        } else {
                            throw new Error('No session');
                        }
                    } catch {
                        await AsyncStorage.removeItem('supabase_session');
                        set({ isAuthenticated: false, user: null, session: null, isLoading: false });
                    }
                }
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await authApi.signin({ email, password });
            if (data.session) {
                await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
            }
            set({ isAuthenticated: true, user: data.user, session: data.session, isLoading: false });
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || 'Login failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    googleLogin: async () => {
        set({ isLoading: true, error: null });
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
            if (!idToken) throw new Error('No ID token from Google');

            const { data } = await authApi.googleOAuth(idToken);
            if (data.session) {
                await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
                set({ isAuthenticated: true, user: data.user, session: data.session, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (err: any) {
            let message = 'Google sign in failed';
            if (err.code === statusCodes.SIGN_IN_CANCELLED) {
                message = 'Sign in was cancelled';
            } else if (err.code === statusCodes.IN_PROGRESS) {
                message = 'Sign in is already in progress';
            } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                message = 'Google Play Services not available or outdated';
            } else {
                message = err.response?.data?.message || err.message || message;
            }
            set({ error: message, isLoading: false });
        }
    },

    signup: async (email, password, firstName, lastName) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await authApi.signup({ email, password, firstName, lastName });
            if (data.session) {
                await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
                set({ isAuthenticated: true, user: data.user, session: data.session, isLoading: false });
            } else {
                // Email verification required
                set({ isLoading: false });
            }
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || 'Registration failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    logout: async () => {
        try {
            await authApi.signout();
        } catch {
            // Ignore signout error
        }
        await AsyncStorage.removeItem('supabase_session');
        set({ isAuthenticated: false, user: null, session: null });
    },

    forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
            await authApi.forgotPassword(email);
            set({ isLoading: false });
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || 'Failed to send reset email';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    clearError: () => set({ error: null }),
}));
