import apiClient from './client';

export interface SignupPayload {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    username?: string;
}

export interface SigninPayload {
    email: string;
    password: string;
}

export interface AuthSession {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in: number;
    token_type: 'bearer';
    user: any;
}

export interface AuthResponse {
    message: string;
    user: any;
    session: AuthSession | null;
}

export const authApi = {
    signup: (payload: SignupPayload) =>
        apiClient.post<AuthResponse>('/auth/supabase/signup', payload),

    signin: (payload: SigninPayload) =>
        apiClient.post<AuthResponse>('/auth/supabase/signin', payload),

    signout: () =>
        apiClient.post('/auth/supabase/signout'),

    googleOAuth: (idToken: string) =>
        apiClient.post<AuthResponse>('/auth/supabase/oauth/google', { idToken }),

    refresh: (refreshToken: string) =>
        apiClient.post<AuthResponse>('/auth/supabase/refresh', { refreshToken }),

    getCurrentUser: () =>
        apiClient.get('/auth/supabase/me'),

    forgotPassword: (email: string) =>
        apiClient.post('/auth/supabase/forgot-password', { email }),

    updatePassword: (newPassword: string) =>
        apiClient.post('/auth/supabase/update-password', { newPassword }),

    resendVerification: (email: string) =>
        apiClient.post('/auth/supabase/resend-verification', { email }),
};
