// Account management: signup's camelCase name metadata, refreshUser, and the
// change-password payload. refreshUser must never touch tokens.
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('../../native/TruecallerAuth', () => ({ TruecallerAuth: { clear: jest.fn() } }));
jest.mock('../../api/profiles', () => ({ profilesApi: {} }));
jest.mock('../../api/client', () => ({ __esModule: true, default: { post: jest.fn(async () => ({ data: {} })) } }));

import apiClient from '../../api/client';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../authStore';

const signIn = (user_metadata: any, email = 'aarav@example.com') => {
    useAuthStore.getState().setSession({
        access_token: 'tok',
        refresh_token: 'refresh-1',
        user: { id: 'u1', email, email_confirmed_at: 'x', app_metadata: { provider: 'email' }, user_metadata },
    } as any);
    return useAuthStore.getState();
};

describe('displayNameOf reads the camelCase names email signup wrote', () => {
    it('uses firstName + lastName instead of the email prefix', () => {
        expect(signIn({ firstName: 'Aarav', lastName: 'Sharma' }).user!.name).toBe('Aarav Sharma');
    });

    it('still prefers snake_case / full_name when present', () => {
        expect(signIn({ first_name: 'A', last_name: 'B', firstName: 'X' }).user!.name).toBe('A B');
        expect(signIn({ full_name: 'Full', firstName: 'X' }).user!.name).toBe('Full');
    });
});

describe('refreshUser', () => {
    it('updates name and email without touching the session or tokens', () => {
        const before = signIn({});
        useAuthStore.getState().refreshUser({ fullName: 'Aarav Sharma', email: 'new@example.com' });
        const after = useAuthStore.getState();
        expect(after.user!.name).toBe('Aarav Sharma');
        expect(after.user!.email).toBe('new@example.com');
        expect(after.accessToken).toBe(before.accessToken);
        expect(after.refreshToken).toBe('refresh-1');
        expect(after.session).toBe(before.session);
        expect(after.status).toBe('authenticated');
    });

    it('never shows an internal Truecaller address and keeps a name when none comes back', () => {
        signIn({ full_name: 'Kept' });
        useAuthStore.getState().refreshUser({ fullName: '', email: '9170@truecaller.temp', emailIsInternal: true });
        expect(useAuthStore.getState().user!.name).toBe('Kept');
        expect(useAuthStore.getState().user!.email).toBe('');
    });

    it('is a no-op when signed out', () => {
        useAuthStore.setState({ user: null });
        useAuthStore.getState().refreshUser({ fullName: 'X' });
        expect(useAuthStore.getState().user).toBeNull();
    });
});

describe('authApi.updatePassword', () => {
    it('sends the current password the server requires', async () => {
        await authApi.updatePassword('Old#pass1', 'New#pass1');
        expect(apiClient.post).toHaveBeenCalledWith('/auth/supabase/update-password', {
            currentPassword: 'Old#pass1',
            newPassword: 'New#pass1',
        });
    });
});
