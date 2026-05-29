import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { authApi } from '../api/auth';
import { TruecallerAuth } from '../native/TruecallerAuth';

export type AuthStatus =
    | 'initializing'       // app just launched, checking stored session
    | 'unauthenticated'    // no session, show login screen
    | 'awaiting_verification' // signed up but email not confirmed
    | 'authenticated'      // fully logged in
    | 'refreshing';        // access token being refreshed

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    provider: 'email' | 'google' | 'truecaller';
    emailVerified: boolean;
}

interface AuthState {
    // ── Core State ──
    status: AuthStatus;
    user: AuthUser | null;
    session: Session | null;
    isLoading: boolean; // Retained for compatibility with existing UI

    // ── Derived (computed from session) ──
    accessToken: string | null;
    isAuthenticated: boolean;

    // ── Pending verification ──
    pendingVerificationEmail: string | null;

    // ── Error ──
    error: string | null;

    // ── Actions ──
    setSession: (session: Session) => void;
    setStatus: (status: AuthStatus) => void;
    setPendingVerification: (email: string) => void;
    clearPendingVerification: () => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    clearSession: () => void;
    hydrateFromSupabaseUser: (user: User, session: Session) => void;

    // ── API Actions ──
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    googleLogin: (idToken: string) => Promise<void>;
    truecallerLogin: (profile: {
        accessToken: string;
        phoneNumber: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatarUrl?: string;
    }) => Promise<void>;
    signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
}

const mapSupabaseUser = (user: User): AuthUser => ({
    id: user.id,
    email: user.email!,
    name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email!.split('@')[0],
    avatarUrl:
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null,
    provider: (user.app_metadata?.provider as 'email' | 'google' | 'truecaller') || 'email',
    emailVerified: !!user.email_confirmed_at,
});

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            status: 'initializing',
            isLoading: true,
            user: null,
            session: null,
            accessToken: null,
            isAuthenticated: false,
            pendingVerificationEmail: null,
            error: null,

            setSession: (session) =>
                set({
                    session,
                    accessToken: session.access_token,
                    user: mapSupabaseUser(session.user),
                    isAuthenticated: true,
                    status: 'authenticated',
                    error: null,
                    isLoading: false,
                }),

            setStatus: (status) => set({ status }),

            setPendingVerification: (email) =>
                set({
                    pendingVerificationEmail: email,
                    status: 'awaiting_verification',
                    isLoading: false,
                }),

            clearPendingVerification: () =>
                set({ pendingVerificationEmail: null }),

            setError: (error) => set({ error, isLoading: false }),
            clearError: () => set({ error: null }),

            clearSession: () =>
                set({
                    session: null,
                    accessToken: null,
                    user: null,
                    isAuthenticated: false,
                    status: 'unauthenticated',
                    pendingVerificationEmail: null,
                    error: null,
                    isLoading: false,
                }),

            hydrateFromSupabaseUser: (user, session) =>
                set({
                    session,
                    accessToken: session.access_token,
                    user: mapSupabaseUser(user),
                    isAuthenticated: true,
                    status: 'authenticated',
                    isLoading: false,
                }),

            initialize: async () => {
                const state = get();
                // Check if we have a refresh token stored
                const refreshToken = (state as any).refreshToken;

                if (refreshToken) {
                    try {
                        // Use refresh token to get new session
                        const { data } = await authApi.refresh(refreshToken);
                        if (data.session) {
                            get().setSession(data.session);
                            return; // Successfully restored session
                        }
                    } catch {
                        // Refresh failed — clear and show login
                    }
                    get().clearSession();
                } else {
                    set({ status: 'unauthenticated', isLoading: false });
                }
            },

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await authApi.signin({ email, password });
                    if (data.session) {
                        get().setSession(data.session);
                    }
                } catch (err: any) {
                    const message = err.response?.data?.message || err.message || 'Login failed';
                    get().setError(message);
                    throw new Error(message);
                }
            },

            googleLogin: async (idToken: string) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await authApi.googleOAuth(idToken);
                    if (data.session) {
                        get().setSession(data.session);
                    } else {
                        set({ isLoading: false });
                    }
                } catch (err: any) {
                    const message = err.response?.data?.message || err.message || 'Google sign in failed';
                    get().setError(message);
                }
            },

            truecallerLogin: async (profile: {
                accessToken: string;
                phoneNumber: string;
                firstName?: string;
                lastName?: string;
                email?: string;
                avatarUrl?: string;
            }) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await authApi.truecallerOAuth(profile);
                    if (data.session) {
                        get().setSession(data.session);
                    }
                } catch (err: any) {
                    const message = err.response?.data?.message || err.message || 'Truecaller sign in failed';
                    get().setError(message);
                    throw new Error(message);
                }
            },

            signup: async (email, password, firstName, lastName) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await authApi.signup({ email, password, firstName, lastName });
                    if (data.session) {
                        get().setSession(data.session);
                    } else {
                        get().setPendingVerification(email);
                    }
                } catch (err: any) {
                    const message = err.response?.data?.message || err.message || 'Registration failed';
                    get().setError(message);
                    throw new Error(message);
                }
            },

            logout: async () => {
                try {
                    await authApi.signout();
                } catch {
                    // Ignore signout error
                }
                // Forget the cached Truecaller session so the next sign-in
                // re-prompts the bottom-sheet consent (Requirements 14.1, 14.2).
                // Safe to invoke unconditionally — the JS wrapper is a no-op
                // when the native module is unavailable (e.g. iOS).
                try {
                    TruecallerAuth.clear();
                } catch {
                    // Ignore Truecaller clear errors — sign-out must still proceed
                }
                get().clearSession();
            },

            forgotPassword: async (email) => {
                set({ isLoading: true, error: null });
                try {
                    await authApi.forgotPassword(email);
                    set({ isLoading: false });
                } catch (err: any) {
                    const message = err.response?.data?.message || err.message || 'Failed to send reset email';
                    get().setError(message);
                    throw new Error(message);
                }
            },
        }),
        {
            name: 'upcheck-auth',
            storage: createJSONStorage(() => ({
                getItem: (key) => SecureStore.getItemAsync(key),
                setItem: (key, value) => SecureStore.setItemAsync(key, value),
                removeItem: (key) => SecureStore.deleteItemAsync(key),
            })),
            // Only persist minimal data to avoid SecureStore size limit (2048 bytes)
            // Store: refresh_token for session restoration, user.id/email for quick access
            // Do NOT persist full session object or user metadata
            partialize: (state) => ({
                refreshToken: state.session?.refresh_token,
                userId: state.user?.id,
                userEmail: state.user?.email,
                pendingVerificationEmail: state.pendingVerificationEmail,
            }),
        }
    )
);
