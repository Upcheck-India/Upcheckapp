import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/auth';
import { supabase } from '../services/supabase';

// ─── Storage Keys ────────────────────────────────────────────────
const STORAGE_KEYS = {
    ACCESS_TOKEN: '@upcheck_access_token',
    REFRESH_TOKEN: '@upcheck_refresh_token',
    USER: '@upcheck_user',
};

export interface User {
    id: string;
    email: string;
    fullName?: string;
    roles: string[];
    is2faEnabled: boolean;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    phoneNumber?: string;
    avatarUrl?: string;
    lastLoginAt?: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // ─── Actions ─────────────────────────────────────────────
    googleLogin: (idToken: string) => Promise<any>;
    emailLogin: (emailOrPhone: string, password: string, rememberMe?: boolean) => Promise<any>;
    register: (email: string, password: string, fullName: string, phoneNumber?: string) => Promise<any>;
    phoneLogin: (phoneNumber: string, otp: string) => Promise<any>;
    loginWith2FA: (tempToken: string, code: string) => Promise<void>;
    logout: () => Promise<void>;
    logoutAllDevices: () => Promise<void>;
    checkAuth: () => Promise<void>;
    refreshAccessToken: () => Promise<string | null>;
    setAccessToken: (token: string) => void;
    setUser: (user: User | null) => void;
    clearError: () => void;
}

// ─── Helpers: Persist tokens securely ────────────────────────────
async function persistTokens(accessToken: string, refreshToken: string, user?: any) {
    try {
        await AsyncStorage.multiSet([
            [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
            [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
            ...(user ? [[STORAGE_KEYS.USER, JSON.stringify(user)]] : []),
        ] as [string, string][]);
    } catch (e) {
        console.warn('Failed to persist tokens:', e);
    }
}

async function clearPersistedTokens() {
    try {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.ACCESS_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
            STORAGE_KEYS.USER,
        ]);
    } catch (e) {
        console.warn('Failed to clear tokens:', e);
    }
}

async function getPersistedTokens() {
    try {
        const values = await AsyncStorage.multiGet([
            STORAGE_KEYS.ACCESS_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
            STORAGE_KEYS.USER,
        ]);
        return {
            accessToken: values[0][1],
            refreshToken: values[1][1],
            user: values[2][1] ? JSON.parse(values[2][1]) : null,
        };
    } catch (e) {
        return { accessToken: null, refreshToken: null, user: null };
    }
}

// ─── Supabase session sync helper ────────────────────────────────
async function syncSupabaseSession(data: any) {
    if (data.supabase_access_token && data.supabase_refresh_token) {
        try {
            await supabase.auth.setSession({
                access_token: data.supabase_access_token,
                refresh_token: data.supabase_refresh_token,
            });
        } catch (e) {
            console.warn('Supabase session sync failed:', e);
        }
    }
}

// ─── Handle successful auth response ─────────────────────────────
async function handleAuthSuccess(
    data: any,
    set: (state: Partial<AuthState>) => void,
) {
    await syncSupabaseSession(data);
    await persistTokens(data.access_token, data.refresh_token, data.user);

    set({
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
    });
}

// ═══════════════════════════════════════════════════════════════════
// ─── Auth Store ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    setAccessToken: (token) => set({ accessToken: token, isAuthenticated: !!token }),
    setUser: (user) => set({ user }),
    clearError: () => set({ error: null }),

    // ─── Google Login ────────────────────────────────────────
    googleLogin: async (idToken: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await AuthService.googleLogin(idToken);

            if (data.requires2fa) {
                set({ isLoading: false });
                return data;
            }

            await handleAuthSuccess(data, set);
            return data;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // ─── Email/Password Login ────────────────────────────────
    emailLogin: async (emailOrPhone: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
            const data = await AuthService.login(emailOrPhone, password, rememberMe);

            if (data.requires2fa) {
                set({ isLoading: false });
                return data;
            }

            await handleAuthSuccess(data, set);
            return data;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // ─── Register ────────────────────────────────────────────
    register: async (email: string, password: string, fullName: string, phoneNumber?: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await AuthService.register(email, password, fullName, phoneNumber);
            set({ isLoading: false });
            return data;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // ─── Phone OTP Login ─────────────────────────────────────
    phoneLogin: async (phoneNumber: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await AuthService.verifyOtp(phoneNumber, otp);

            if (data.requires2fa) {
                set({ isLoading: false });
                return data;
            }

            await handleAuthSuccess(data, set);
            return data;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // ─── 2FA Login ───────────────────────────────────────────
    loginWith2FA: async (tempToken: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await AuthService.login2FA(tempToken, code);
            await handleAuthSuccess(data, set);
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // ─── Logout ──────────────────────────────────────────────
    logout: async () => {
        const { refreshToken } = get();
        set({ isLoading: true });
        try {
            await AuthService.logout(refreshToken || undefined);
            await supabase.auth.signOut();
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            await clearPersistedTokens();
            set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    },

    // ─── Logout All Devices ──────────────────────────────────
    logoutAllDevices: async () => {
        const { accessToken } = get();
        set({ isLoading: true });
        try {
            if (accessToken) {
                await AuthService.logoutAll(accessToken);
            }
            await supabase.auth.signOut();
        } catch (error) {
            console.warn('Logout all failed:', error);
        } finally {
            await clearPersistedTokens();
            set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    },

    // ─── Token Refresh ───────────────────────────────────────
    refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;

        try {
            const data = await AuthService.refreshToken(refreshToken);
            await persistTokens(data.access_token, data.refresh_token);
            set({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                isAuthenticated: true,
            });
            return data.access_token;
        } catch (error) {
            // Refresh failed — force logout
            await clearPersistedTokens();
            set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
            });
            return null;
        }
    },

    // ─── Check Auth on App Start ─────────────────────────────
    checkAuth: async () => {
        set({ isLoading: true });
        try {
            // 1. Load persisted tokens
            const persisted = await getPersistedTokens();

            if (!persisted.refreshToken) {
                set({ isLoading: false, isAuthenticated: false });
                return;
            }

            // Set cached user immediately for fast UI
            if (persisted.user) {
                set({ user: persisted.user });
            }

            // 2. Attempt token refresh
            const data = await AuthService.refreshToken(persisted.refreshToken);
            await persistTokens(data.access_token, data.refresh_token);

            set({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                isAuthenticated: true,
            });

            // 3. Fetch fresh user data
            const user = await AuthService.getMe(data.access_token);
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            set({ user, isLoading: false });
        } catch (error) {
            // Refresh failed — clear everything
            await clearPersistedTokens();
            set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },
}));
