// #33 — no account picker appeared after logout; the app silently re-logged
// into the last Google account. This locks in that signInWithGoogle() always
// clears the native SDK's cached account (GoogleSignin.signOut()) BEFORE
// calling signIn() — that's what forces the picker to reappear — and that a
// signOut() failure (nothing was cached) never blocks the sign-in attempt.
// Also covers #30: the intent argument must reach authStore.googleLogin so
// the backend can gate Sign-In-only auto-provisioning.
jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn(async () => true),
        signIn: jest.fn(),
        signOut: jest.fn(async () => undefined),
    },
    isSuccessResponse: jest.fn(() => true),
    isErrorWithCode: jest.fn(() => false),
    statusCodes: {
        SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
        IN_PROGRESS: 'IN_PROGRESS',
        PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    },
}));
jest.mock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { extra: { googleClientIdWeb: 'web-client-id' } } },
}));

const mockGoogleLogin = jest.fn(async () => ({ requires2FA: false }));
const mockSetError = jest.fn();
jest.mock('../../store/authStore', () => ({
    useAuthStore: Object.assign(
        jest.fn(() => ({ googleLogin: mockGoogleLogin, isLoading: false })),
        { getState: jest.fn(() => ({ setError: mockSetError })) },
    ),
}));

import { renderHook } from '@testing-library/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useGoogleAuth } from '../useGoogleAuth';

describe('useGoogleAuth.signInWithGoogle (#33 / #30)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('clears the cached Google account before signing in, so the picker reappears', async () => {
        const callOrder: string[] = [];
        (GoogleSignin.signOut as jest.Mock).mockImplementation(async () => {
            callOrder.push('signOut');
        });
        (GoogleSignin.signIn as jest.Mock).mockImplementation(async () => {
            callOrder.push('signIn');
            return { type: 'success', data: { idToken: 'id-token-1' } };
        });

        const { result } = renderHook(() => useGoogleAuth());
        await result.current.signInWithGoogle('signin');

        expect(callOrder).toEqual(['signOut', 'signIn']);
    });

    it('still attempts sign-in if signOut() throws (nothing was cached)', async () => {
        (GoogleSignin.signOut as jest.Mock).mockRejectedValue(new Error('nothing cached'));
        (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
            type: 'success',
            data: { idToken: 'id-token-2' },
        });

        const { result } = renderHook(() => useGoogleAuth());
        await result.current.signInWithGoogle('signin');

        expect(GoogleSignin.signIn).toHaveBeenCalled();
        expect(mockGoogleLogin).toHaveBeenCalledWith('id-token-2', 'signin');
    });

    it('forwards "signup" intent from the Create Account screen', async () => {
        (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
            type: 'success',
            data: { idToken: 'id-token-3' },
        });

        const { result } = renderHook(() => useGoogleAuth());
        await result.current.signInWithGoogle('signup');

        expect(mockGoogleLogin).toHaveBeenCalledWith('id-token-3', 'signup');
    });
});
