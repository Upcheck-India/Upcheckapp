import { Config } from '../constants/Config';

const API_BASE_URL = Config.API_BASE_URL; // e.g. http://localhost:3000

export const AuthService = {
    async googleLogin(token: string) {
        const response = await fetch(`${API_BASE_URL}/auth/google/login`, { // Backend endpoint updated to /google/login
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Google login failed');
        return data; // { user, access_token, refresh_token (cookie set), requires2fa, temp_token }
    },

    async refreshToken() {
        // credential: 'include' is crucial for sending cookies
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST', // or GET? Backend is POST
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Refresh failed');
        return data; // { access_token }
    },

    async logout() {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    },

    async getMe(token: string) {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch user');
        return data;
    },

    // 2FA
    async setup2FA(token: string) {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to setup 2FA');
        return data; // { secret, otpAuthUrl }
    },

    async enable2FA(token: string, code: string) {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/enable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token: code }), // Body expects { token: code }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to enable 2FA');
        return data;
    },

    async login2FA(tempToken: string, code: string) {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken, token: code }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || '2FA Login failed');
        return data; // { user, access_token, refresh_token }
    },

    // Password Management
    async forgotPassword(email: string) {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to request password reset');
        return data;
    },

    async resetPassword(token: string, refreshToken: string, newPassword: string) {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, refreshToken, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Password reset failed');
        return data;
    },

    async changePassword(token: string, oldPassword: string, newPassword: string) {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ oldPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Change password failed');
        return data;
    },

    // Session Management
    async getSessions(token: string) {
        const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch sessions');
        return data;
    },

    async revokeSession(token: string, sessionId: string) {
        const response = await fetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to revoke session');
        return data;
    }
};
