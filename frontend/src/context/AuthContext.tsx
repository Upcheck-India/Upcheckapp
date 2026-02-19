import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../services/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, AuthState } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType extends AuthState {
    login: (data: any) => Promise<any>;
    register: (data: any) => Promise<{ requiresEmailConfirmation: boolean; email: string } | void>;
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

// ---------------------------------------------------------------------------
// Supabase uses PKCE by default. After Google OAuth or email verification,
// the redirect URL contains  ?code=xxxx  — NOT ?access_token=xxxx.
// We must call exchangeCodeForSession() to exchange it for real tokens.
// onAuthStateChange fires automatically after a successful exchange so we
// never need to call setState() manually after this.
// ---------------------------------------------------------------------------
async function processAuthUrl(rawUrl: string): Promise<void> {
    if (!rawUrl) return;
    try {
        if (rawUrl.includes('code=')) {
            const { error } = await supabase.auth.exchangeCodeForSession(rawUrl);
            if (error) console.error('[Auth] exchangeCodeForSession error:', error.message);
        } else if (rawUrl.includes('access_token=')) {
            const parsed = Linking.parse(rawUrl);
            const access_token = (parsed.queryParams?.access_token as string) ?? '';
            const refresh_token = (parsed.queryParams?.refresh_token as string) ?? '';
            if (access_token) {
                const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                if (error) console.error('[Auth] setSession error:', error.message);
            }
        }
    } catch (err: any) {
        console.error('[Auth] processAuthUrl error:', err.message);
    }
}

function friendlyLoginError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Incorrect email or password. Please try again.';
    if (msg.includes('Email not confirmed')) return 'Email not verified. Check your inbox for a confirmation link before signing in.';
    if (msg.includes('Too many requests')) return 'Too many attempts. Please wait a few minutes and try again.';
    if (msg.includes('User not found')) return 'No account found with that email.';
    return msg || 'Login failed. Please try again.';
}

function friendlyRegisterError(msg: string): string {
    if (msg.includes('already registered') || msg.includes('User already registered')) return 'An account already exists with this email. Try signing in instead.';
    if (msg.includes('Password should be')) return 'Password must be at least 6 characters long.';
    if (msg.includes('valid email')) return 'Please enter a valid email address.';
    return msg || 'Registration failed. Please try again.';
}

function convertSupabaseUser(u: SupabaseUser): User {
    const meta = u.user_metadata ?? {};
    const fullName: string = meta.full_name ?? meta.name ?? '';
    const parts = fullName.split(' ');
    return {
        id: u.id,
        email: u.email ?? '',
        username: meta.username ?? u.email?.split('@')[0] ?? '',
        firstName: meta.firstName ?? parts[0] ?? '',
        lastName: meta.lastName ?? parts.slice(1).join(' ') ?? '',
        emailVerified: u.email_confirmed_at != null,
        authProvider: u.app_metadata?.provider ?? 'email',
        verificationLevel: 'basic',
    } as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // ── onAuthStateChange is the SINGLE source of truth for auth state ──────
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setState({
                user: session?.user ? convertSupabaseUser(session.user) : null,
                isAuthenticated: !!session?.user,
                isLoading: false,
            });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setState({
                user: session?.user ? convertSupabaseUser(session.user) : null,
                isAuthenticated: !!session?.user,
                isLoading: false,
            });
        });

        return () => subscription.unsubscribe();
    }, []);

    // ── Deep link handler — covers email verification links and OAuth when   ──
    // ── the app is opened/resumed from a background state.                  ──
    // ── Note: openAuthSessionAsync in signInWithGoogle intercepts in-app    ──
    // ── browser redirects directly, so we call processAuthUrl there too.    ──
    useEffect(() => {
        Linking.getInitialURL().then((url) => { if (url) processAuthUrl(url); });
        const sub = Linking.addEventListener('url', (e) => processAuthUrl(e.url));
        return () => sub.remove();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setState({
            user: session?.user ? convertSupabaseUser(session.user) : null,
            isAuthenticated: !!session?.user,
            isLoading: false,
        });
    };

    // ── Email / Password Login ───────────────────────────────────────────────
    const login = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        const email = ((data.email ?? data.emailOrPhone) as string | undefined ?? '').trim().toLowerCase();
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email,
                password: data.password,
            });
            if (error) throw error;
            // onAuthStateChange fires automatically and sets isAuthenticated: true
            return authData;
        } catch (err: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(friendlyLoginError(err.message ?? ''));
        }
    };

    // ── Email / Password Register ────────────────────────────────────────────
    const register = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        const email = ((data.email ?? '') as string).trim().toLowerCase();
        try {
            const { data: authData, error } = await supabase.auth.signUp({
                email,
                password: data.password,
                options: {
                    data: {
                        firstName: data.firstName ?? '',
                        lastName: data.lastName ?? '',
                        username: data.username ?? '',
                    },
                },
            });
            if (error) throw error;

            if (authData.session) {
                // Email confirmation is disabled in Supabase — user signed in immediately.
                // onAuthStateChange fires and navigates to Main automatically.
                return { requiresEmailConfirmation: false, email };
            } else {
                // Email confirmation is enabled — tell user to check inbox.
                setState((prev) => ({ ...prev, isLoading: false }));
                return { requiresEmailConfirmation: true, email };
            }
        } catch (err: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(friendlyRegisterError(err.message ?? ''));
        }
    };

    // ── Google OAuth ─────────────────────────────────────────────────────────
    const signInWithGoogle = async () => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const redirectUrl = Linking.createURL('auth');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                },
            });
            if (error) throw error;

            if (data?.url) {
                // openAuthSessionAsync intercepts the redirect — it does NOT fire
                // the Linking event listener, so we must handle the result URL here.
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                if (result.type === 'success' && result.url) {
                    await processAuthUrl(result.url);
                }
            }
        } catch (err: any) {
            throw new Error(err.message ?? 'Google sign-in failed. Please try again.');
        } finally {
            // Always clear loading — onAuthStateChange updates isAuthenticated
            setState((prev) => ({ ...prev, isLoading: false }));
        }
    };

    // ── Misc Auth ────────────────────────────────────────────────────────────
    const linkGoogle = async () => {
        alert('Google account linking is not available in the current setup.');
    };

    const logout = async () => {
        await supabase.auth.signOut();
        // onAuthStateChange fires with null session → isAuthenticated: false
    };

    const logoutAllDevices = async () => { await logout(); };

    const loginWith2FA = async (_tempToken: string, _code: string) => {
        throw new Error('Two-factor authentication is not configured.');
    };

    // ── OTP / Magic Link Login ───────────────────────────────────────────────
    const requestOtpLogin = async (email: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: { shouldCreateUser: false },
            });
            if (error) throw error;
            setState((prev) => ({ ...prev, isLoading: false }));
            return { message: 'A login code has been sent to your email.' };
        } catch (err: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(err.message ?? 'Failed to send login code. Please try again.');
        }
    };

    const verifyOtpLogin = async (email: string, otp: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: email.trim().toLowerCase(),
                token: otp.trim(),
                type: 'email',
            });
            if (error) throw error;
            // onAuthStateChange fires and sets isAuthenticated: true
        } catch (err: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(err.message ?? 'Invalid or expired code. Please try again.');
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
