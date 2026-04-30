import { useEffect, useCallback, useState } from 'react';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

let TruecallerSDK: any = null;

try {
  TruecallerSDK = require('@ajitpatel28/react-native-truecaller').useTruecaller;
} catch (e) {
  console.warn('Truecaller SDK not available');
}

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
  const [isInitialized, setIsInitialized] = useState(false);
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

  useEffect(() => {
    if (!TruecallerSDK || !config.androidClientId) {
      setIsAvailable(false);
      return;
    }

    const initSDK = async () => {
      try {
        const sdk = TruecallerSDK(config);
        await sdk.initializeTruecallerSDK?.();
        const usable = await sdk.isSdkUsable?.();
        setIsAvailable(usable);
        setIsInitialized(true);
      } catch (error) {
        console.error('Truecaller SDK init error:', error);
        setIsAvailable(false);
      }
    };

    initSDK();
  }, []);

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

  const signInWithTruecaller = useCallback(async () => {
    if (!TruecallerSDK || !isAvailable) {
      setError('Truecaller is not available on this device');
      return false;
    }

    useAuthStore.setState({ isLoading: true, error: null });

    try {
      const sdk = TruecallerSDK(config);
      
      const result = await sdk.openTruecallerForVerification?.();
      
      if (!result) {
        throw new Error('Truecaller verification was cancelled');
      }

      const profile = parseProfile(result);
      
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
        return true;
      }
      
      return false;
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.message || 'Truecaller sign in failed';
      
      if (message.includes('cancel') || message.includes('dismiss')) {
        setError(null);
      } else {
        setError(message);
      }
      return false;
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  }, [isAvailable, parseProfile, setError, setSession]);

  const isMissedCallVerification = useCallback((response: any): boolean => {
    return response?.verificationMode === 'MISSED_CALL' || 
           response?.verificationType === 'missed_call';
  }, []);

  return {
    isAvailable,
    isInitialized,
    signInWithTruecaller,
    isMissedCallVerification,
  };
}
