import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '../services/auth';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        checkSession();

        // Listen for auth state changes
        const { data: { subscription } } = AuthService.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const checkSession = async () => {
        try {
            const currentSession = await AuthService.getSession();
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
        } catch (error) {
            console.error('Error checking session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        try {
            await AuthService.signOut();
            setUser(null);
            setSession(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const refreshSession = async () => {
        await checkSession();
    };

    const value: AuthContextType = {
        user,
        session,
        isLoading,
        isAuthenticated: !!session,
        signOut,
        refreshSession,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
