import { useEffect, useCallback, useState, useRef } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

const extra = Constants.expoConfig?.extra ?? {};

interface TruecallerUserProfile {
  phoneNumber: string;
  firstName: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  accessToken: string;
}

interface TruecallerSDKResult {
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  accessToken?: string;
  token?: string;
  authCode?: string;
}

export function useTruecallerAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const { setError, setSession, truecallerLogin } = useAuthStore();

  // Track if we've attempted SDK initialization
  const initAttempted = useRef(false);

  // Try to import and use the Truecaller SDK
  const truecallerModuleRef = useRef<any>(null);

  // Initialize SDK on mount - handle native module not available case
  useEffect(() => {
    const initSDK = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      const clientId = extra.truecallerAndroidClientId || '';

      if (!clientId) {
        console.warn('Truecaller: No Android Client ID configured');
        setIsAvailable(true); // Still show button for fallback
        setIsSdkReady(false);
        return;
      }

      // Check if running on Android (Truecaller SDK only works on Android)
      if (Platform.OS !== 'android') {
        console.warn('Truecaller: SDK only available on Android');
        setIsAvailable(true); // Show button for iOS users too (will use fallback)
        setIsSdkReady(false);
        return;
      }

      try {
        // Try to dynamically import the module
        const truecallerModule = require('@ajitpatel28/react-native-truecaller');
        truecallerModuleRef.current = truecallerModule;

        if (!truecallerModule || !truecallerModule.useTruecaller) {
          console.warn('Truecaller: Module not available or incomplete');
          setIsAvailable(true);
          setIsSdkReady(false);
          return;
        }

        const config = {
          androidClientId: clientId,
          iosAppKey: extra.truecallerIosAppKey || '',
          iosAppLink: extra.truecallerIosAppLink || '',
          androidButtonColor: '#0087D0',
          androidButtonTextColor: '#FFFFFF',
          androidConsentHeading: 'Sign in to UpCheck',
          androidConsentMode: 'TRUECALLER_ANDROID_CONSENT_MODE_BOTTOMSHEET',
          androidSdkOptions: 'TRUECALLER_ANDROID_SDK_OPTION_VERIFY_ALL_USERS',
        };

        // Initialize SDK
        if (truecallerModule.initializeTruecallerSDK) {
          truecallerModule.initializeTruecallerSDK(config);
          setIsSdkReady(true);
          setIsAvailable(true);
          console.log('Truecaller: SDK initialized successfully');
        }
      } catch (error: any) {
        console.error('Truecaller SDK initialization error:', error?.message || error);
        // SDK not available - but we still show the button for fallback
        setIsAvailable(true);
        setIsSdkReady(false);
        setSdkError(error?.message || 'SDK not available');
      }
    };

    initSDK();
  }, []);

  const parseProfile = (response: TruecallerSDKResult | null): TruecallerUserProfile | null => {
    if (!response) return null;

    return {
      phoneNumber: response.phoneNumber || '',
      firstName: response.firstName || 'User',
      lastName: response.lastName,
      email: response.email,
      avatarUrl: response.avatarUrl,
      accessToken: response.accessToken || response.token || response.authCode || 'verified',
    };
  };

  const signInWithTruecaller = useCallback(async () => {
    useAuthStore.setState({ isLoading: true, error: null });

    try {
      // If SDK is ready, try Truecaller OAuth first
      if (isSdkReady && truecallerModuleRef.current) {
        try {
          const result = await truecallerModuleRef.current.openTruecallerForVerification();

          if (result) {
            const profile = parseProfile(result);

            if (profile && profile.phoneNumber) {
              await truecallerLogin(profile);
              return true;
            }
          }
        } catch (sdkError: any) {
          const errorMsg = sdkError?.message || '';

          // If user cancelled, don't show error
          if (errorMsg.includes('cancel') || errorMsg.includes('dismiss') || errorMsg.includes('denied')) {
            useAuthStore.setState({ isLoading: false });
            return false;
          }

          // If SDK failed but we have Truecaller installed, try fallback
          console.warn('Truecaller SDK failed, falling back to phone verification:', errorMsg);
        }
      }

      // Fallback: Manual phone verification (missed call flow)
      // This will be handled by showing a phone input modal
      useAuthStore.setState({ isLoading: false });
      return false;
    } catch (error: any) {
      const message = error?.message || 'Truecaller sign in failed';
      setError(message);
      useAuthStore.setState({ isLoading: false });
      return false;
    }
  }, [isSdkReady, truecallerLogin, setError]);

  return {
    isAvailable, // Always true if we want to show the button
    isSdkReady,  // True if native SDK is actually usable
    sdkError,
    signInWithTruecaller,
  };
}