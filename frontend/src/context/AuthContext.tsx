import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../services/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, AuthState } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

const LOG = '[AuthContext]';

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
    console.log(LOG, 'processAuthUrl called, rawUrl:', rawUrl);
    if (!rawUrl) { console.warn(LOG, 'processAuthUrl: empty URL, skipping'); return; }
    try {
        if (rawUrl.includes('code=')) {
            console.log(LOG, 'processAuthUrl: PKCE code detected, calling exchangeCodeForSession');
            const { data, error } = await supabase.auth.exchangeCodeForSession(rawUrl);
            if (error) {
                console.error(LOG, 'exchangeCodeForSession ERROR:', error.message, error);
            } else {
                console.log(LOG, 'exchangeCodeForSession SUCCESS, user:', data.session?.user?.email, 'session expires:', data.session?.expires_at);
            }
        } else if (rawUrl.includes('access_token=')) {
            console.log(LOG, 'processAuthUrl: access_token detected (implicit flow), calling setSession');
            const parsed = Linking.parse(rawUrl);
            const access_token = (parsed.queryParams?.access_token as string) ?? '';
            const refresh_token = (parsed.queryParams?.refresh_token as string) ?? '';
            if (access_token) {
                const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                if (error) console.error(LOG, 'setSession ERROR:', error.message);
                else console.log(LOG, 'setSession SUCCESS');
            }
        } else {
            console.warn(LOG, 'processAuthUrl: URL contains neither code= nor access_token=, URL:', rawUrl);
        }
    } catch (err: any) {
        console.error(LOG, 'processAuthUrl EXCEPTION:', err.message, err);
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
        console.log(LOG, 'AuthProvider mounted — calling getSession()');
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) console.error(LOG, 'getSession() ERROR:', error.message);
            console.log(LOG, 'getSession() result — user:', session?.user?.email ?? 'none', '| session:', session ? 'EXISTS' : 'NULL');
            setState({
                user: session?.user ? convertSupabaseUser(session.user) : null,
                isAuthenticated: !!session?.user,
                isLoading: false,
            });
            console.log(LOG, 'Initial state set — isAuthenticated:', !!session?.user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(LOG, 'onAuthStateChange fired — event:', event, '| user:', session?.user?.email ?? 'none', '| isAuthenticated:', !!session?.user);
            setState({
                user: session?.user ? convertSupabaseUser(session.user) : null,
                isAuthenticated: !!session?.user,
                isLoading: false,
            });
            console.log(LOG, 'State updated after onAuthStateChange — isAuthenticated:', !!session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    // ── Deep link handler — covers email verification links and OAuth when   ──
    // ── the app is opened/resumed from a background state.                  ──
    // ── Note: openAuthSessionAsync in signInWithGoogle intercepts in-app    ──
    // ── browser redirects directly, so we call processAuthUrl there too.    ──
    useEffect(() => {
        Linking.getInitialURL().then((url) => {
            console.log(LOG, 'getInitialURL():', url ?? 'null');
            if (url) processAuthUrl(url);
        });
        const sub = Linking.addEventListener('url', (e) => {
            console.log(LOG, 'Linking url event:', e.url);
            processAuthUrl(e.url);
        });
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
        console.log(LOG, 'login() called — email:', email, '| password length:', data.password?.length ?? 0);
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email,
                password: data.password,
            });
            if (error) {
                console.error(LOG, 'signInWithPassword ERROR:', error.message, '| status:', error.status, '| code:', (error as any).code);
                throw error;
            }
            console.log(LOG, 'signInWithPassword SUCCESS — user:', authData.user?.email, '| session:', authData.session ? 'EXISTS' : 'NULL');
            return authData;
        } catch (err: any) {
            console.error(LOG, 'login() catch:', err.message);
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(friendlyLoginError(err.message ?? ''));
        }
    };

    // ── Email / Password Register ────────────────────────────────────────────
    const register = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        const email = ((data.email ?? '') as string).trim().toLowerCase();
        console.log(LOG, 'register() called — email:', email, '| username:', data.username);
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
            if (error) {
                console.error(LOG, 'signUp ERROR:', error.message, '| status:', error.status);
                throw error;
            }
            console.log(LOG, 'signUp result — user:', authData.user?.email, '| user.id:', authData.user?.id, '| session:', authData.session ? 'EXISTS (email confirm OFF)' : 'NULL (email confirm ON)', '| identities count:', authData.user?.identities?.length);

            if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                console.warn(LOG, 'signUp: identities is empty — user already exists with this email but may not be confirmed');
                throw new Error('An account already exists with this email. Try signing in instead.');
            }

            if (authData.session) {
                console.log(LOG, 'register() — email confirmation is DISABLED, user is signed in immediately');
                return { requiresEmailConfirmation: false, email };
            } else {
                console.log(LOG, 'register() — email confirmation is ENABLED, user must verify inbox before logging in');
                setState((prev) => ({ ...prev, isLoading: false }));
                return { requiresEmailConfirmation: true, email };
            }
        } catch (err: any) {
            console.error(LOG, 'register() catch:', err.message);
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(friendlyRegisterError(err.message ?? ''));
        }
    };

    // ── Google OAuth ─────────────────────────────────────────────────────────
    const signInWithGoogle = async () => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const redirectUrl = Linking.createURL('auth');
            console.log(LOG, 'signInWithGoogle() — redirectUrl:', redirectUrl);
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                },
            });
            if (error) {
                console.error(LOG, 'signInWithOAuth ERROR:', error.message);
                throw error;
            }
            console.log(LOG, 'signInWithOAuth result — OAuth URL generated:', data?.url ? 'YES' : 'NO');

            if (data?.url) {
                console.log(LOG, 'Opening browser with OAuth URL, waiting for redirect back to:', redirectUrl);
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                console.log(LOG, 'openAuthSessionAsync result — type:', result.type, '| url:', (result as any).url ?? 'none');
                if (result.type === 'success' && (result as any).url) {
                    await processAuthUrl((result as any).url);
                } else if (result.type === 'cancel') {
                    console.warn(LOG, 'Google OAuth cancelled by user');
                } else if (result.type === 'dismiss') {
                    console.warn(LOG, 'Google OAuth browser dismissed');
                }
            } else {
                console.error(LOG, 'signInWithOAuth returned no URL!');
            }
        } catch (err: any) {
            console.error(LOG, 'signInWithGoogle() catch:', err.message);
            throw new Error(err.message ?? 'Google sign-in failed. Please try again.');
        } finally {
            console.log(LOG, 'signInWithGoogle() finally — resetting isLoading');
            setState((prev) => ({ ...prev, isLoading: false }));
        }
    };

    // ── Misc Auth ────────────────────────────────────────────────────────────
    const linkGoogle = async () => {
        alert('Google account linking is not available in the current setup.');
    };

    const logout = async () => {
        console.log(LOG, 'logout() called');
        const { error } = await supabase.auth.signOut();
        if (error) console.error(LOG, 'signOut ERROR:', error.message);
        else console.log(LOG, 'signOut SUCCESS — onAuthStateChange will fire');
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
