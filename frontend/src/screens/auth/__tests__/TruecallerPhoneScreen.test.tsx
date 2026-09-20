/**
 * C0.1: with Truecaller one-tap unavailable, this screen is the off-ramp. It
 * must offer the two routes that actually complete today — email OTP and
 * Google — and must NOT show a phone-number field, because the missed-call
 * verification that field fed no longer exists.
 */
const mockSignInWithGoogle = jest.fn(async () => undefined as any);
const mockSetSession = jest.fn();
const mockArmSignupIntent = jest.fn();

jest.mock('../../../hooks/useGoogleAuth', () => ({
    useGoogleAuth: () => ({ signInWithGoogle: mockSignInWithGoogle }),
}));
jest.mock('../../../store/authStore', () => {
    const useAuthStore: any = (sel: any) =>
        sel({ setSession: mockSetSession, armSignupIntent: mockArmSignupIntent });
    // OfflineIndicator (inside ScreenWrapper) reaches for the store imperatively.
    useAuthStore.getState = () => ({ recoverSession: async () => undefined });
    return { useAuthStore };
});
jest.mock('../../../native/TruecallerAuth', () => ({
    TruecallerAuth: {
        addVerificationListener: jest.fn(() => ({ remove: jest.fn() })),
        clear: jest.fn(),
        verifyOtp: jest.fn(),
    },
}));
jest.mock('../../../api/auth', () => ({ authApi: { truecallerMissedCall: jest.fn() } }));
jest.mock('../../../features/analytics', () => ({ capture: jest.fn(), EVENTS: {} }));
jest.mock('../../../components/ui/ConsentNotice', () => ({ ConsentNotice: () => null }));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TruecallerPhoneScreen } from '../TruecallerPhoneScreen';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = (params?: object) => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const utils = render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <TruecallerPhoneScreen navigation={navigation} route={{ params }} />
        </SafeAreaProvider>,
    );
    return { ...utils, navigation };
};

beforeEach(() => jest.clearAllMocks());

describe('TruecallerPhoneScreen', () => {
    it('offers email and Google, and never a phone-number field', () => {
        const { getByText, queryByText } = renderScreen();
        expect(getByText('Continue with email')).toBeTruthy();
        expect(getByText('Continue with Google')).toBeTruthy();
        expect(queryByText('Mobile number')).toBeNull();
        expect(queryByText('Verify with missed call')).toBeNull();
    });

    it('email routes to the live email-OTP screen', () => {
        const { getByText, navigation } = renderScreen();
        fireEvent.press(getByText('Continue with email'));
        expect(navigation.navigate).toHaveBeenCalledWith('OtpLogin');
    });

    it('Google signs in, carrying the signup intent when there is one', async () => {
        const { getByText } = renderScreen({ intent: 'own_farm' });
        fireEvent.press(getByText('Continue with Google'));
        await waitFor(() =>
            expect(mockSignInWithGoogle).toHaveBeenCalledWith('signup', 'own_farm'),
        );
    });

    it('Google from the login path does not auto-provision an account', async () => {
        const { getByText } = renderScreen();
        fireEvent.press(getByText('Continue with Google'));
        await waitFor(() =>
            expect(mockSignInWithGoogle).toHaveBeenCalledWith('signin', undefined),
        );
    });
});
