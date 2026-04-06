import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { authApi } from '../api/auth';

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
    provider: 'email' | 'google';
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
    provider: (user.app_metadata?.provider as 'email' | 'google') || 'email',
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
                if (state.session) {
                    try {
                        const { data } = await authApi.getCurrentUser();
                        set({
                            isAuthenticated: true,
                            user: mapSupabaseUser(data.user),
                            status: 'authenticated',
                            isLoading: false
                        });
                    } catch {
                        // Token expired — try refresh before giving up
                        try {
                            if (state.session.refresh_token) {
                                const { data } = await authApi.refresh(state.session.refresh_token);
                                if (data.session) {
                                    get().setSession(data.session);
                                    return; // Successfully refreshed
                                }
                            }
                        } catch {
                            // Refresh also failed
                        }
                        get().clearSession();
                    }
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
            // Only persist user, session (refresh token mostly), and pending email.
            // Do NOT persist accessToken directly as per Blueprint.
            partialize: (state) => ({
                user: state.user,
                pendingVerificationEmail: state.pendingVerificationEmail,
                session: state.session,
            }),
        }
    )
);
