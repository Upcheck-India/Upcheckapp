import { supabase } from './supabase';

import { Config } from '../constants/Config';

const API_BASE_URL = Config.API_BASE_URL;

export interface AuthResponse {
    user: any;
    session: any;
    error?: string;
}

export interface OtpResponse {
    message: string;
    verified?: boolean;
}

export const AuthService = {
    /**
     * Register a new user with email and password
     */
    async register(payload: {
        email: string;
        password: string;
        fullName?: string;
        phone?: string;
    }): Promise<AuthResponse> {
        const { data, error } = await supabase.auth.signUp({
            email: payload.email,
            password: payload.password,
            options: {
                data: {
                    full_name: payload.fullName,
                    phone: payload.phone,
                },
            },
        });

        if (error) {
            throw new Error(error.message);
        }

        return {
            user: data.user,
            session: data.session,
        };
    },

    /**
     * Login with email and password
     */
    async login(payload: { email: string; password: string }): Promise<AuthResponse> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: payload.email,
            password: payload.password,
        });

        if (error) {
            throw new Error(error.message);
        }

        return {
            user: data.user,
            session: data.session,
        };
    },

    /**
     * Send OTP to email or phone
     */
    async sendOtp(payload: { email?: string; phone?: string }): Promise<OtpResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login/otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to send OTP');
        }

        return response.json();
    },

    /**
     * Verify OTP code
     */
    async verifyOtp(payload: { email?: string; phone?: string; token: string }): Promise<OtpResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to verify OTP');
        }

        return response.json();
    },

    /**
     * Login with OTP after verification - creates or retrieves user session
     */
    async loginWithOtp(payload: { email?: string; phone?: string; token: string }): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login-with-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to login with OTP');
        }

        const result = await response.json();

        // If the backend returns session tokens, set them in Supabase
        if (result.access_token && result.refresh_token) {
            await supabase.auth.setSession({
                access_token: result.access_token,
                refresh_token: result.refresh_token,
            });
        }

        return {
            user: result.user,
            session: result.session,
        };
    },

    /**
     * Get the current authenticated user
     */
    async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    /**
     * Get the current session
     */
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const session = await this.getSession();
        return !!session;
    },

    /**
     * Sign out the current user
     */
    async signOut(): Promise<void> {
        await supabase.auth.signOut();
    },

    /**
     * Listen to auth state changes
     */
    onAuthStateChange(callback: (event: string, session: any) => void) {
        return supabase.auth.onAuthStateChange(callback);
    },
};
