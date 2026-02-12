import { create } from 'zustand';
import { AuthService } from '../services/auth';
import { supabase } from '../services/supabase';

export interface User {
    id: string;
    email: string;
    fullName?: string;
    roles: string[];
    is2faEnabled: boolean;
    phoneNumber?: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (token: string) => Promise<any>;
    loginWith2FA: (tempToken: string, code: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    setAccessToken: (token: string) => void;
    setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    setAccessToken: (token) => set({ accessToken: token, isAuthenticated: !!token }),
    setUser: (user) => set({ user }),

    login: async (googleToken: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await AuthService.googleLogin(googleToken);
            if (data.requires2fa) {
                set({ isLoading: false }); // Stop loading, let UI handle 2FA redirect
                return data; // Return data so comp knows to redirect
            }

            // Sync Supabase Session if available
            if (data.supabase_access_token && data.supabase_refresh_token) {
                await supabase.auth.setSession({
                    access_token: data.supabase_access_token,
                    refresh_token: data.supabase_refresh_token,
                });
            }

            set({
                user: data.user,
                accessToken: data.access_token,
                isAuthenticated: true,
                isLoading: false
            });
            return data;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    loginWith2FA: async (tempToken: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await AuthService.login2FA(tempToken, code);

            // Sync Supabase Session if available
            if (data.supabase_access_token && data.supabase_refresh_token) {
                await supabase.auth.setSession({
                    access_token: data.supabase_access_token,
                    refresh_token: data.supabase_refresh_token,
                });
            }

            set({
                user: data.user,
                accessToken: data.access_token,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await AuthService.logout();
            await supabase.auth.signOut(); // Logout from Supabase too
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            // Attempt to refresh token (uses HttpOnly cookie)
            const data = await AuthService.refreshToken();

            // Sync Supabase Session if available on refresh
            if (data.supabase_access_token && data.supabase_refresh_token) {
                await supabase.auth.setSession({
                    access_token: data.supabase_access_token,
                    refresh_token: data.supabase_refresh_token,
                });
            }

            set({ accessToken: data.access_token, isAuthenticated: true });

            // Now fetch user details
            const user = await AuthService.getMe(data.access_token);
            set({ user, isLoading: false });
        } catch (error) {
            // Refresh failed (cookie expired or invalid)
            set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    }
}));
