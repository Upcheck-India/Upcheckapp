const API_BASE_URL = 'http://localhost:3000'; // TODO: replace with deployed backend URL

export const AuthService = {
    async sendOtp(payload: { email?: string; phone?: string }) {
        const response = await fetch(`${API_BASE_URL}/auth/login/otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to send OTP');
        }

        return response.json();
    },

    async verifyOtp(payload: { email?: string; phone?: string; token: string }) {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to verify OTP');
        }

        return response.json();
    },

    async loginWithOtp(payload: { email?: string; phone?: string; token: string }) {
        const response = await fetch(`${API_BASE_URL}/auth/login-with-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to login with OTP');
        }

        return response.json();
    },
};
