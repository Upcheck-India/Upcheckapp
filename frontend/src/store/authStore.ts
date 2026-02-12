import { create } from 'zustand';
import { AuthService } from '../services/auth';

export interface User {
    id: string;
    email: string;
    fullName?: string; // from profile
    roles: string[];
    is2faEnabled: boolean;
    phoneNumber?: string;
    // Add other fields as needed
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (token: string) => Promise<any>; // Returns data (maybe { requires2fa, temp_token })
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
