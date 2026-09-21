/**
 * C5.5: a forged recovery link must not establish a session; a real one must.
 * Wiring test — the validation rules themselves are in recoveryLink.test.ts.
 */
const mockSetSession = jest.fn(async () => ({ error: null }));
const mockGetInitialURL = jest.fn();

jest.mock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { extra: { supabaseUrl: 'https://proj.supabase.co' } } },
}));
jest.mock('../../../lib/supabase', () => ({
    // Arrow wrapper: jest.mock is hoisted above the const it closes over.
    supabase: { auth: { setSession: (s: unknown) => (mockSetSession as any)(s), updateUser: jest.fn(), getSession: jest.fn(), signOut: jest.fn() } },
}));
jest.mock('../../../api/auth', () => ({ authApi: { reset2faCheck: jest.fn() } }));
jest.mock('../../../store/authStore', () => {
    const useAuthStore: any = (sel: any) => sel({});
    // OfflineIndicator (inside ScreenWrapper) reaches for the store imperatively.
    useAuthStore.getState = () => ({ recoverSession: async () => undefined });
    return { useAuthStore };
});

import React from 'react';
import { Linking } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ResetPasswordScreen } from '../ResetPasswordScreen';

const b64url = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: object) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.sig`;
const inAnHour = () => Math.floor(Date.now() / 1000) + 3600;
const link = (access: string, type = 'recovery') =>
    `upcheckapp://reset-password#access_token=${access}&refresh_token=rt123&token_type=bearer&type=${type}`;

const renderWithUrl = (url: string | null) => {
    mockGetInitialURL.mockResolvedValue(url);
    return render(
        <SafeAreaProvider
            initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
        >
            <ResetPasswordScreen navigation={{ navigate: jest.fn() }} />
        </SafeAreaProvider>,
    );
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'getInitialURL').mockImplementation(mockGetInitialURL);
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
});

it('establishes a session from a valid recovery link', async () => {
    const token = jwt({ iss: 'https://proj.supabase.co/auth/v1', exp: inAnHour() });
    renderWithUrl(link(token));
    await waitFor(() =>
        expect(mockSetSession).toHaveBeenCalledWith({ access_token: token, refresh_token: 'rt123' }),
    );
});

it.each([
    ['wrong issuer', link(jwt({ iss: 'https://attacker.supabase.co/auth/v1', exp: inAnHour() }))],
    ['wrong type', link(jwt({ iss: 'https://proj.supabase.co/auth/v1', exp: inAnHour() }), 'signup')],
    ['expired', link(jwt({ iss: 'https://proj.supabase.co/auth/v1', exp: Math.floor(Date.now() / 1000) - 60 }))],
    ['garbage', 'upcheckapp://reset-password#access_token=garbage&refresh_token=x&type=recovery'],
])('ignores a forged link (%s) and keeps the expired-link hint', async (_label, url) => {
    const { findByText } = renderWithUrl(url);
    expect(await findByText(/If the link expired/)).toBeTruthy();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSetSession).not.toHaveBeenCalled();
});
