import { useEffect, useState } from 'react';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const extra = Constants.expoConfig?.extra ?? {};

// Configure Google Sign-In globally
const hasClientIds = !!(extra.googleClientIdWeb || extra.googleClientIdIos || extra.googleClientIdAndroid);

if (hasClientIds) {
    GoogleSignin.configure({
        webClientId: extra.googleClientIdWeb || undefined,
        iosClientId: extra.googleClientIdIos || undefined,
        // scopes: ['profile', 'email'], // default
    });
}

export function useGoogleAuth() {
    const { googleLogin, isLoading } = useAuthStore();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsReady(hasClientIds);
    }, []);

    const signInWithGoogle = async () => {
        if (!hasClientIds) {
            useAuthStore.getState().setError('Google Sign-In is not configured. Please contact support.');
            return;
        }

        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const response = await GoogleSignin.signIn();
            
            if (isSuccessResponse(response)) {
                const idToken = response.data.idToken;
                if (idToken) {
                    googleLogin(idToken);
                } else {
                    useAuthStore.getState().setError('No ID token received from Google.');
                }
            } else {
                // response is probably cancelled
                console.log('Google sign in cancelled/other:', response);
            }
        } catch (error: any) {
            if (isErrorWithCode(error)) {
                if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                    // user cancelled the login flow
                    return;
                } else if (error.code === statusCodes.IN_PROGRESS) {
                    // operation (e.g. sign in) is in progress already
                    return;
                } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    useAuthStore.getState().setError('Google Play Services not available or outdated.');
                    return;
                }
            }
            useAuthStore.getState().setError(error.message || 'Google sign in failed');
        }
    };

    return {
        signInWithGoogle,
        isReady,
        isLoading,
    };
}
