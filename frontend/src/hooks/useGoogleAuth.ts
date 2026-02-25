import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra ?? {};

export function useGoogleAuth() {
    const { googleLogin, isLoading } = useAuthStore();

    // Guard: warn if client IDs are missing (deleted OAuth client scenario)
    const hasClientIds = !!(extra.googleClientIdWeb || extra.googleClientIdIos || extra.googleClientIdAndroid);

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: extra.googleClientIdWeb,
        iosClientId: extra.googleClientIdIos,
        androidClientId: extra.googleClientIdAndroid,
    });

    useEffect(() => {
        if (!response) return;

        if (response.type === 'success') {
            const idToken = response.params.id_token;
            if (idToken) {
                googleLogin(idToken);
            }
        } else if (response.type === 'error') {
            const errorMsg = response.error?.message || 'Google sign in returned an error';
            useAuthStore.getState().setError(errorMsg);
        }
        // 'cancel' and 'dismiss' are user-initiated, no error needed
    }, [response]);

    const signInWithGoogle = async () => {
        if (!hasClientIds) {
            useAuthStore.getState().setError('Google Sign-In is not configured. Please contact support.');
            return;
        }
        if (!request) {
            useAuthStore.getState().setError('Google Sign-In is not ready. Please try again.');
            return;
        }
        try {
            await promptAsync();
        } catch (err: any) {
            useAuthStore.getState().setError(err.message || 'Google sign in failed');
        }
    };

    return {
        signInWithGoogle,
        isReady: !!request && hasClientIds,
        isLoading,
    };
}

