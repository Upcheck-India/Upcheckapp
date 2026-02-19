import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../services/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, AuthState } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType extends AuthState {
    login: (data: any) => Promise<any>;
    register: (data: any) => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Helper to convert Supabase user to app User type
    const convertSupabaseUser = (supabaseUser: SupabaseUser): User => {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || '',
            firstName: supabaseUser.user_metadata?.firstName || '',
            lastName: supabaseUser.user_metadata?.lastName || '',
            emailVerified: supabaseUser.email_confirmed_at != null,
            authProvider: supabaseUser.app_metadata?.provider || 'email',
            verificationLevel: 'basic',
        } as User;
    };

    // Initialize auth state from Supabase
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setState({
                    user: convertSupabaseUser(session.user),
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Always set isLoading:false so no spinner stays indefinitely
            if (session?.user) {
                setState({
                    user: convertSupabaseUser(session.user),
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Handle deep link OAuth redirects
    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            const url = Linking.parse(event.url);
            
            if (url.path === 'auth' || url.queryParams?.access_token) {
                const accessToken = url.queryParams?.access_token as string;
                const refreshToken = url.queryParams?.refresh_token as string;
                
                if (accessToken) {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    
                    if (error) {
                        console.error('Error setting session from deep link:', error);
                    } else if (data.user) {
                        setState({
                            user: convertSupabaseUser(data.user),
                            isAuthenticated: true,
                            isLoading: false,
                        });
                    }
                }
            }
        };

        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setState({
                user: convertSupabaseUser(session.user),
                isAuthenticated: true,
                isLoading: false,
            });
        } else {
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    };


    const login = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) throw error;

            if (authData.user) {
                setState({
                    user: convertSupabaseUser(authData.user),
                    isAuthenticated: true,
                    isLoading: false,
                });
            }

            return authData;
        } catch (error: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(error.message || 'Login failed');
        }
    };

    const register = async (data: any) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        username: data.username,
                    },
                },
            });

            if (error) throw error;

            if (authData.user) {
                setState({
                    user: convertSupabaseUser(authData.user),
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
        } catch (error: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(error.message || 'Registration failed');
        }
    };

    const signInWithGoogle = async () => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const redirectUrl = Linking.createURL('auth');
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;

            if (data?.url) {
                await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
            }
            // Browser closed — onAuthStateChange will fire if login succeeded.
            // Always reset isLoading here so the spinner doesn't stay forever
            // if the user cancelled or the deep link was already handled.
            setState((prev) => ({ ...prev, isLoading: false }));
        } catch (error: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(error.message || 'Google sign-in failed');
        }
    };

    const linkGoogle = async () => {
        // Supabase doesn't support linking OAuth providers after initial sign up
        // This would need custom implementation or use Supabase's linkIdentity API
        console.log('Link Google - not implemented with Supabase');
        alert('Google account linking is not available with current auth setup');
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } finally {
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    };

    const logoutAllDevices = async () => {
        // Supabase signs out current session only
        // For all devices, you'd need to call Supabase admin API from backend
        await logout();
    };

    const loginWith2FA = async (tempToken: string, code: string) => {
        // Supabase handles 2FA differently - this is for backward compatibility
        console.log('2FA login - not fully implemented with Supabase');
        throw new Error('2FA is not configured for Supabase auth');
    };

    const requestOtpLogin = async (email: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) throw error;

            setState((prev) => ({ ...prev, isLoading: false }));
            return { message: 'OTP sent to email' };
        } catch (error: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(error.message || 'Failed to send OTP');
        }
    };

    const verifyOtpLogin = async (email: string, otp: string) => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
            });

            if (error) throw error;

            if (data.user) {
                setState({
                    user: convertSupabaseUser(data.user),
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
        } catch (error: any) {
            setState((prev) => ({ ...prev, isLoading: false }));
            throw new Error(error.message || 'Invalid OTP');
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
