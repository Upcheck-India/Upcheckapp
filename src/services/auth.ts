import { supabase } from './supabase';

export const AuthService = {
    async signInWithEmail(email: string) {
        return await supabase.auth.signInWithOtp({ email });
    },

    async verifyOtp(email: string, token: string) {
        return await supabase.auth.verifyOtp({ email, token, type: 'email' });
    },

    async signInWithPassword(email: string, password: string) {
        return await supabase.auth.signInWithPassword({ email, password });
    },

    async signUp(email: string, password: string, data: any) {
        return await supabase.auth.signUp({
            email,
            password,
            options: {
                data: data // first_name, last_name, etc.
            }
        });
    },

    async signOut() {
        return await supabase.auth.signOut();
    },

    async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }
};
