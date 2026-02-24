import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra ?? {};

export function useGoogleAuth() {
    const { googleLogin, isLoading } = useAuthStore();

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: extra.googleClientIdWeb,
        iosClientId: extra.googleClientIdIos,
        androidClientId: extra.googleClientIdAndroid,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const idToken = response.params.id_token;
            if (idToken) {
                googleLogin(idToken);
            }
        }
    }, [response]);

    const signInWithGoogle = async () => {
        try {
            await promptAsync();
        } catch (err: any) {
            useAuthStore.getState().setError(err.message || 'Google sign in failed');
        }
    };

    return {
        signInWithGoogle,
        isReady: !!request,
        isLoading,
    };
}
