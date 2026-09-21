/**
 * After logging out, you must still be able to start a new account FROM
 * ONBOARDING.
 *
 * W3 stopped sending signed-out farmers to the language picker, which was
 * right — they have already chosen a language, and walking Language → Welcome
 * → "Skip for now" → Login to reach a form you have used a hundred times is a
 * tax on every single sign-out.
 *
 * But it also made Login the first thing a returning farmer sees, and Login's
 * "Create account" went straight to the bare form. So the first-run flow
 * became unreachable once you had logged out: "if I log out and want to start
 * a new account from onboarding it's not letting me now."
 *
 * Skipping to `Register` is not merely a shorter path — it silently answers a
 * question. `RegisterScreen` defaults a missing intent to `own_farm`, so a
 * WORKER signing up on a shared phone is routed into "create your farm"
 * instead of "enter a join code", and W2 now persists that wrong answer
 * server-side as their resume point.
 */
jest.mock('../../hooks/useGoogleAuth', () => ({
    useGoogleAuth: () => ({ signInWithGoogle: jest.fn(), isReady: true, isLoading: false }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from '../../screens/auth/LoginScreen';
import { WelcomeScreen } from '../../screens/onboarding/WelcomeScreen';
import { IntentScreen } from '../../screens/onboarding/IntentScreen';
import { DataNoticeScreen } from '../../screens/onboarding/DataNoticeScreen';
import { useAuthStore } from '../../store/authStore';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const wrap = (ui: React.ReactElement) =>
    render(<SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>{ui}</SafeAreaProvider>);

beforeEach(() => {
    useAuthStore.setState({ isLoading: false, error: null } as any);
});

describe('signing up is reachable after a logout', () => {
    it('sends "Create account" into onboarding, not into the bare form', () => {
        const navigation = { navigate: jest.fn(), goBack: jest.fn() };
        const { getByText } = wrap(<LoginScreen navigation={navigation} />);

        fireEvent.press(getByText('Create Account'));

        // The START of the flow. Landing on 'Register' would skip the intent
        // question and silently default it.
        expect(navigation.navigate).toHaveBeenCalledWith('Welcome');
    });

    it('walks Welcome → Intent → DataNotice → Register carrying a real answer', async () => {
        const fromWelcome = { navigate: jest.fn(), goBack: jest.fn() };
        const welcome = wrap(<WelcomeScreen navigation={fromWelcome} />);
        fireEvent.press(welcome.getByText('Get started'));
        expect(fromWelcome.navigate).toHaveBeenCalledWith('Intent');

        const fromIntent = { navigate: jest.fn(), goBack: jest.fn() };
        const intent = wrap(<IntentScreen navigation={fromIntent} />);
        fireEvent.press(intent.getByText('Continue'));

        // An intent the farmer actually chose, not RegisterScreen's default.
        expect(fromIntent.navigate).toHaveBeenCalledWith(
            'DataNotice',
            expect.objectContaining({ intent: expect.any(String) }),
        );

        // The data notice (compliance C2.2) hands the same answer to Register.
        const chosen = fromIntent.navigate.mock.calls[0][1].intent;
        const fromNotice = { navigate: jest.fn(), goBack: jest.fn() };
        const notice = wrap(<DataNoticeScreen navigation={fromNotice} route={{ params: { intent: chosen } }} />);
        fireEvent.press(notice.getByText('I understand — continue'));
        await waitFor(() =>
            expect(fromNotice.navigate).toHaveBeenCalledWith('Register', { intent: chosen }),
        );
    });

    it('lets someone who only wanted to sign in come straight back', () => {
        // Or the button becomes a trap for a farmer who mistapped it.
        const navigation = { navigate: jest.fn(), goBack: jest.fn() };
        const { getByText } = wrap(<WelcomeScreen navigation={navigation} />);

        fireEvent.press(getByText('Skip for now'));

        expect(navigation.navigate).toHaveBeenCalledWith('Login');
    });
});
