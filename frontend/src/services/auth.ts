import { Config } from '../constants/Config';

const API_BASE_URL = Config.API_BASE_URL;

// ─── Helper: Parse API response ──────────────────────────────────
async function handleResponse<T = any>(response: Response, fallbackMsg: string): Promise<T> {
    let data: any;
    try {
        data = await response.json();
    } catch {
        if (!response.ok) throw new Error(fallbackMsg);
        return {} as T;
    }
    if (!response.ok) {
        throw new Error(data.message || fallbackMsg);
    }
    return data as T;
}

// ─── Helper: Wrap fetch with network error handling ─────────────
async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, options);
    } catch (error: any) {
        if (error.message === 'Network request failed' || error.name === 'TypeError') {
            throw new Error('No internet connection. Please check your network and try again.');
        }
        throw error;
    }
}

function authHeader(token: string) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

// ═══════════════════════════════════════════════════════════════════
// ─── Auth Service ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export const AuthService = {

    // ─── Google Login ────────────────────────────────────────────
    async googleLogin(idToken: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
        return handleResponse(response, 'Google login failed');
    },

    // ─── Email/Password Register ─────────────────────────────────
    async register(email: string, password: string, fullName: string, phoneNumber?: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName, phoneNumber }),
        });
        return handleResponse(response, 'Registration failed');
    },

    // ─── Email/Password Login ────────────────────────────────────
    async login(emailOrPhone: string, password: string, rememberMe = false) {
        const response = await safeFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrPhone, password, rememberMe }),
        });
        return handleResponse(response, 'Login failed');
    },

    // ─── Phone OTP ───────────────────────────────────────────────
    async sendOtp(phoneNumber: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber }),
        });
        return handleResponse(response, 'Failed to send OTP');
    },

    async verifyOtp(phoneNumber: string, otp: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, otp }),
        });
        return handleResponse(response, 'OTP verification failed');
    },

    // ─── Token Refresh ───────────────────────────────────────────
    async refreshToken(refreshToken?: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ refreshToken }),
        });
        return handleResponse(response, 'Token refresh failed');
    },

    // ─── Logout ──────────────────────────────────────────────────
    async logout(refreshToken?: string) {
        await safeFetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ refreshToken }),
        });
    },

    async logoutAll(accessToken: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/logout-all`, {
            method: 'POST',
            headers: authHeader(accessToken),
        });
        return handleResponse(response, 'Failed to logout all devices');
    },

    // ─── Get Current User ────────────────────────────────────────
    async getMe(accessToken: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/me`, {
            headers: authHeader(accessToken),
        });
        return handleResponse(response, 'Failed to fetch user');
    },

    // ─── Email Verification ──────────────────────────────────────
    async resendVerificationEmail(email: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/verify-email/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return handleResponse(response, 'Failed to resend verification email');
    },

    // ─── 2FA ─────────────────────────────────────────────────────
    async setup2FA(accessToken: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/2fa/setup`, {
            method: 'POST',
            headers: authHeader(accessToken),
        });
        return handleResponse(response, 'Failed to setup 2FA');
    },

    async enable2FA(accessToken: string, code: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/2fa/enable`, {
            method: 'POST',
            headers: authHeader(accessToken),
            body: JSON.stringify({ token: code }),
        });
        return handleResponse(response, 'Failed to enable 2FA');
    },

    async disable2FA(accessToken: string, code: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/2fa/disable`, {
            method: 'POST',
            headers: authHeader(accessToken),
            body: JSON.stringify({ token: code }),
        });
        return handleResponse(response, 'Failed to disable 2FA');
    },

    async regenerateBackupCodes(accessToken: string, code: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/2fa/backup-codes/regenerate`, {
            method: 'POST',
            headers: authHeader(accessToken),
            body: JSON.stringify({ token: code }),
        });
        return handleResponse(response, 'Failed to regenerate backup codes');
    },

    async login2FA(tempToken: string, code: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/2fa/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken, token: code }),
        });
        return handleResponse(response, '2FA login failed');
    },

    // ─── Password Management ─────────────────────────────────────
    async forgotPassword(email: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return handleResponse(response, 'Failed to request password reset');
    },

    async resetPassword(token: string, refreshToken: string, newPassword: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, refreshToken, newPassword }),
        });
        return handleResponse(response, 'Password reset failed');
    },

    async changePassword(accessToken: string, oldPassword: string, newPassword: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: authHeader(accessToken),
            body: JSON.stringify({ oldPassword, newPassword }),
        });
        return handleResponse(response, 'Failed to change password');
    },

    // ─── Session Management ──────────────────────────────────────
    async getSessions(accessToken: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/sessions`, {
            headers: authHeader(accessToken),
        });
        return handleResponse(response, 'Failed to fetch sessions');
    },

    async revokeSession(accessToken: string, sessionId: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: authHeader(accessToken),
        });
        return handleResponse(response, 'Failed to revoke session');
    },

    // ─── Account Management ──────────────────────────────────────
    async deleteAccount(accessToken: string, password?: string) {
        const response = await safeFetch(`${API_BASE_URL}/auth/account`, {
            method: 'DELETE',
            headers: authHeader(accessToken),
            body: JSON.stringify({ password }),
        });
        return handleResponse(response, 'Failed to delete account');
    },
};
