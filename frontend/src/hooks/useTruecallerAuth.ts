import { useEffect, useCallback, useState } from 'react';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { useTruecaller } from '@ajitpatel28/react-native-truecaller';

const extra = Constants.expoConfig?.extra ?? {};

interface TruecallerUserProfile {
  phoneNumber: string;
  firstName: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  accessToken: string;
}

export function useTruecallerAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const { setError, setSession } = useAuthStore();

  const config = {
    androidClientId: extra.truecallerAndroidClientId || '',
    iosAppKey: extra.truecallerIosAppKey || '',
    iosAppLink: extra.truecallerIosAppLink || '',
    androidButtonColor: '#0087D0',
    androidButtonTextColor: '#FFFFFF',
    androidConsentHeading: 'Sign in to UpCheck',
    androidConsentMode: 'TRUECALLER_ANDROID_CONSENT_MODE_BOTTOMSHEET',
    androidSdkOptions: 'TRUECALLER_ANDROID_SDK_OPTION_VERIFY_ALL_USERS',
  };

  const {
    initializeTruecallerSDK,
    openTruecallerForVerification,
    isSdkUsable,
    userProfile: sdkUserProfile,
    error: sdkError,
    isTruecallerInitialized,
  } = useTruecaller(config);

  // Check SDK availability after initialization
  useEffect(() => {
    if (!config.androidClientId) {
      setIsAvailable(false);
      return;
    }

    const checkAvailability = async () => {
      try {
        if (isTruecallerInitialized) {
          const usable = await isSdkUsable();
          setIsAvailable(usable);
        }
      } catch (error) {
        console.error('Truecaller SDK availability check error:', error);
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, [isTruecallerInitialized, isSdkUsable]);

  // Initialize SDK on mount
  useEffect(() => {
    if (config.androidClientId) {
      initializeTruecallerSDK();
    }
  }, [initializeTruecallerSDK]);

  // Handle SDK errors
  useEffect(() => {
    if (sdkError) {
      console.error('Truecaller SDK error:', sdkError);
    }
  }, [sdkError]);

  const parseProfile = useCallback((response: any): TruecallerUserProfile | null => {
    if (!response) return null;

    const profile = response.profile || response;

    return {
      phoneNumber: profile.phoneNumber || profile.phone || profile.mobileNumber,
      firstName: profile.firstName || profile.givenName || profile.name?.split(' ')[0] || 'User',
      lastName: profile.lastName || profile.familyName || profile.name?.split(' ').slice(1).join(' '),
      email: profile.email,
      avatarUrl: profile.avatarUrl || profile.thumbnailUrl || profile.avatar_url,
      accessToken: response.accessToken || response.token || response.authCode || 'verified',
    };
  }, []);

  // Handle successful verification from SDK
  useEffect(() => {
    const handleProfile = async () => {
      if (sdkUserProfile) {
        useAuthStore.setState({ isLoading: true, error: null });

        try {
          const profile = parseProfile(sdkUserProfile);

          if (!profile || !profile.phoneNumber) {
            throw new Error('Failed to get user profile from Truecaller');
          }

          const { data } = await authApi.truecallerOAuth({
            accessToken: profile.accessToken,
            phoneNumber: profile.phoneNumber,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          });

          if (data.session) {
            setSession(data.session);
          }
        } catch (error: any) {
          const message = error?.message || error?.response?.data?.message || 'Truecaller sign in failed';
          setError(message);
        } finally {
          useAuthStore.setState({ isLoading: false });
        }
      }
    };

    handleProfile();
  }, [sdkUserProfile, parseProfile, setSession, setError]);

  const signInWithTruecaller = useCallback(async () => {
    if (!isAvailable) {
      setError('Truecaller is not available on this device');
      return false;
    }

    useAuthStore.setState({ isLoading: true, error: null });

    try {
      await openTruecallerForVerification();
      // The userProfile will be handled by the useEffect above
      return true;
    } catch (error: any) {
      const message = error?.message || 'Truecaller verification failed';

      if (message.includes('cancel') || message.includes('dismiss')) {
        setError(null);
      } else {
        setError(message);
      }
      useAuthStore.setState({ isLoading: false });
      return false;
    }
  }, [isAvailable, openTruecallerForVerification, setError]);

  return {
    isAvailable,
    isInitialized: isTruecallerInitialized,
    signInWithTruecaller,
  };
}