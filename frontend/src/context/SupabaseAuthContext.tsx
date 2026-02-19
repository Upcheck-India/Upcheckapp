import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

interface SupabaseAuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string; username?: string }) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Handle deep link OAuth redirects
        const handleDeepLink = async (event: { url: string }) => {
            const url = Linking.parse(event.url);
            
            // Check if this is an OAuth redirect
            if (url.path === 'auth' || url.queryParams?.access_token) {
                const accessToken = url.queryParams?.access_token as string;
                const refreshToken = url.queryParams?.refresh_token as string;
                
                if (accessToken) {
                    // Set the session from the tokens
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    
                    if (error) {
                        console.error('Error setting session from deep link:', error);
                    } else {
                        setSession(data.session);
                        setUser(data.user);
                    }
                }
            }
        };

        // Get initial URL (app opened via deep link)
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        // Listen for deep link events
        const subscription = Linking.addEventListener('url', handleDeepLink);

        return () => subscription.remove();
    }, []);

    const signUp = async (email: string, password: string, metadata?: { firstName?: string; lastName?: string; username?: string }) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata || {},
                },
            });

            if (error) throw error;

            setSession(data.session);
            setUser(data.user);
        } catch (error: any) {
            throw new Error(error.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            setSession(data.session);
            setUser(data.user);
        } catch (error: any) {
            throw new Error(error.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        setIsLoading(true);
        try {
            // Create redirect URL for OAuth callback
            const redirectUrl = Linking.createURL('auth');
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    // Use web client ID for Google OAuth
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;

            // Open the OAuth URL in browser
            if (data?.url) {
                await Linking.openURL(data.url);
            }
        } catch (error: any) {
            throw new Error(error.message || 'Google sign-in failed');
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            setSession(null);
            setUser(null);
        } catch (error: any) {
            throw new Error(error.message || 'Sign out failed');
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const redirectUrl = Linking.createURL('reset-password');
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;
        } catch (error: any) {
            throw new Error(error.message || 'Password reset failed');
        }
    };

    const updatePassword = async (newPassword: string) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;
        } catch (error: any) {
            throw new Error(error.message || 'Password update failed');
        }
    };

    return (
        <SupabaseAuthContext.Provider
            value={{
                session,
                user,
                isLoading,
                signUp,
                signIn,
                signInWithGoogle,
                signOut,
                resetPassword,
                updatePassword,
            }}
        >
            {children}
        </SupabaseAuthContext.Provider>
    );
};

export const useSupabaseAuth = () => {
    const context = useContext(SupabaseAuthContext);
    if (context === undefined) {
        throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
    }
    return context;
};
