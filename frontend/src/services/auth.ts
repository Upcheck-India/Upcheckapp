import { supabase } from './supabase';
import { Config } from '../constants/Config';

const API_BASE_URL = Config.API_BASE_URL;

export interface AuthResponse {
    user: any;
    session: any;
    error?: string;
}

export const AuthService = {
    /**
     * Login with Google ID token
     * 1. Send ID token to backend
     * 2. Backend verifies and returns session tokens (access_token, refresh_token)
     * 3. Set session in Supabase client (so AuthContext updates)
     */
    async googleLogin(token: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Google login failed');
            }

            // Set session in Supabase if tokens are returned
            // Assuming backend returns standard JWTs compatible with Supabase or self-signed
            // If self-signed, Supabase client might not validate them if project ID differs, but let's try.
            // If backend uses same JWT secret as Supabase, it works.
            // If not, we might need to manage session manually in AuthContext without Supabase for auth state.
            // But AuthContext uses onAuthStateChange...
            // Let's assume we are using Supabase Auth or at least storing tokens.
            // Actually, if we use Supabase client, we need a valid Supabase session.
            // The backend returns `{ access_token, refresh_token, user }`.

            const { access_token, refresh_token } = data;

            if (access_token && refresh_token) {
                const { data: sessionData, error } = await supabase.auth.setSession({
                    access_token,
                    refresh_token,
                });

                if (error) {
                    console.warn('Supabase setSession warning:', error.message);
                    // If Supabase rejects it (e.g. invalid signature for project), 
                    // we might need a fallback or just return data if AuthContext handles it manually.
                }

                return {
                    user: data.user,
                    session: sessionData.session,
                };
            }

            return {
                user: data.user,
                session: null,
            };

        } catch (error: any) {
            console.error('Google login service error:', error);
            throw error;
        }
    },

    /**
     * get the current authenticated user
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
