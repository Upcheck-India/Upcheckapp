import apiClient from './client';

export type AccountType = 'owner' | 'worker';

export interface SignupPayload {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    accountType?: AccountType;
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
    // Present when the account has TOTP 2FA enabled: the session is withheld
    // until a code is verified via twoFactor.login(tempToken, code).
    requires2FA?: boolean;
    tempToken?: string;
}

export interface TwoFactorSetup {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
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

    // Truecaller OAuth 2.0 One-Tap exchange (current flow). The backend
    // completes the PKCE token exchange and userinfo lookup, then mints a
    // session — identity is never trusted from the client.
    truecallerExchange: (payload: {
        authorizationCode: string;
        codeVerifier: string;
        state?: string;
    }) => apiClient.post<AuthResponse>('/auth/supabase/oauth/truecaller/exchange', payload),

    // ── Passwordless email OTP login ──
    loginOtpRequest: (email: string) =>
        apiClient.post('/auth/supabase/login-otp/request', { email }),

    loginOtpVerify: (email: string, otp: string) =>
        apiClient.post<AuthResponse>('/auth/supabase/login-otp/verify', { email, otp }),

    // ── TOTP two-factor authentication ──
    twoFactor: {
        setup: () => apiClient.post<TwoFactorSetup>('/auth/supabase/2fa/setup'),
        enable: (token: string) => apiClient.post<{ enabled: true }>('/auth/supabase/2fa/enable', { token }),
        disable: (token: string) => apiClient.post<{ enabled: false }>('/auth/supabase/2fa/disable', { token }),
        status: () => apiClient.get<{ enabled: boolean }>('/auth/supabase/2fa/status'),
        login: (tempToken: string, token: string) =>
            apiClient.post<AuthResponse>('/auth/supabase/2fa/login', { tempToken, token }),
    },
};
