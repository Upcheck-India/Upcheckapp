import { useEffect, useCallback, useState, useRef } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

const extra = Constants.expoConfig?.extra ?? {};

interface TruecallerUserProfile {
  phoneNumber: string;
  firstName: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  accessToken: string;
}

type VerificationStep =
  | 'idle'
  | 'requesting'
  | 'missed_call_initiated'
  | 'missed_call_received'
  | 'verifying'
  | 'complete'
  | 'error';

export function useTruecallerAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('idle');
  const [ttl, setTtl] = useState<number | null>(null);
  const { setError, truecallerLogin } = useAuthStore();

  const initAttempted = useRef(false);
  const sdkRef = useRef<any>(null);
  const serviceRef = useRef<any>(null);
  const ttlTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const initSDK = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      const clientId = extra.truecallerAndroidClientId || '';

      if (!clientId) {
        console.warn('Truecaller: No Android Client ID configured');
        setIsAvailable(true);
        setIsSdkReady(false);
        return;
      }

      if (Platform.OS !== 'android') {
        console.warn('Truecaller: SDK only available on Android');
        setIsAvailable(true);
        setIsSdkReady(false);
        return;
      }

      try {
        const truecallerModule = require('@dhana-cs/react-native-truecaller');
        sdkRef.current = truecallerModule.TrueCallerSDK;
        serviceRef.current = truecallerModule.trueCallerService;

        if (!serviceRef.current) {
          console.warn('Truecaller: Service not available');
          setIsAvailable(true);
          setIsSdkReady(false);
          return;
        }

        const initialized = await serviceRef.current.initialize({
          buttonColor: '#0087D0',
          buttonTextColor: '#FFFFFF',
          loginTextPrefix: 'Sign in to UpCheck',
          sdkOptions: 'TRUECALLER_ANDROID_SDK_OPTION_VERIFY_ALL_USERS',
        });

        if (initialized) {
          const usable = await serviceRef.current.isUsable();
          setIsSdkReady(usable);
          setIsAvailable(true);
          console.log('Truecaller: SDK initialized, usable:', usable);
        } else {
          setIsAvailable(true);
          setIsSdkReady(false);
          console.warn('Truecaller: SDK initialization returned false');
        }
      } catch (error: any) {
        console.error('Truecaller SDK initialization error:', error?.message || error);
        setIsAvailable(true);
        setIsSdkReady(false);
        setSdkError(error?.message || 'SDK not available');
      }
    };

    initSDK();
  }, []);

  const startTtlCountdown = useCallback((seconds: number) => {
    if (ttlTimerRef.current) {
      clearInterval(ttlTimerRef.current);
    }
    setTtl(seconds);
    ttlTimerRef.current = setInterval(() => {
      setTtl((prev) => {
        if (prev === null || prev <= 1) {
          if (ttlTimerRef.current) clearInterval(ttlTimerRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTtlCountdown = useCallback(() => {
    if (ttlTimerRef.current) {
      clearInterval(ttlTimerRef.current);
      ttlTimerRef.current = null;
    }
    setTtl(null);
  }, []);

  const signInWithTruecaller = useCallback(async () => {
    useAuthStore.setState({ isLoading: true, error: null });

    try {
      if (isSdkReady && serviceRef.current) {
        try {
          setVerificationStep('requesting');

          const authResult = await serviceRef.current.authenticate(['profile', 'phone']);

          if (authResult?.authorizationCode) {
            setVerificationStep('complete');
            const profile: TruecallerUserProfile = {
              phoneNumber: '',
              firstName: 'User',
              accessToken: authResult.authorizationCode,
            };
            await truecallerLogin(profile);
            return true;
          }
        } catch (sdkError: any) {
          const errorMsg = sdkError?.message || '';

          if (errorMsg.includes('cancel') || errorMsg.includes('dismiss') || errorMsg.includes('denied')) {
            useAuthStore.setState({ isLoading: false });
            setVerificationStep('idle');
            return false;
          }

          console.warn('Truecaller SDK auth failed, falling back to phone verification:', errorMsg);
          setVerificationStep('idle');
        }
      }

      useAuthStore.setState({ isLoading: false });
      return false;
    } catch (error: any) {
      const message = error?.message || 'Truecaller sign in failed';
      setError(message);
      useAuthStore.setState({ isLoading: false });
      setVerificationStep('error');
      return false;
    }
  }, [isSdkReady, truecallerLogin, setError]);

  const requestMissedCallVerification = useCallback(async (
    countryCode: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; ttl?: number; error?: string }> => {
    try {
      setVerificationStep('requesting');

      if (!sdkRef.current) {
        const truecallerModule = require('@dhana-cs/react-native-truecaller');
        sdkRef.current = truecallerModule.TrueCallerSDK;
      }

      if (serviceRef.current) {
        const usable = await serviceRef.current.isUsable();
        if (usable) {
          try {
            const authResult = await serviceRef.current.authenticate(['profile', 'phone']);
            if (authResult?.authorizationCode) {
              setVerificationStep('complete');
              await truecallerLogin({
                phoneNumber,
                firstName: 'User',
                accessToken: authResult.authorizationCode,
              });
              return { success: true };
            }
          } catch {
            // OAuth failed, continue with manual missed call flow
          }
        }
      }

      // Simulate the missed call initiation
      // In production, this would use Truecaller's verification API:
      // TrueCallerSDK.requestVerification(countryCode, phoneNumber, callback)
      // which triggers TYPE_MISSED_CALL_INITIATED callback
      const estimatedTtl = 60;
      startTtlCountdown(estimatedTtl);
      setVerificationStep('missed_call_initiated');

      // Simulate waiting for missed call detection
      // In production: callback fires TYPE_MISSED_CALL_RECEIVED
      setTimeout(() => {
        setVerificationStep('missed_call_received');
        stopTtlCountdown();
      }, 3000);

      return { success: true, ttl: estimatedTtl };
    } catch (error: any) {
      const message = error?.message || 'Failed to initiate verification';
      setVerificationStep('error');
      return { success: false, error: message };
    }
  }, [truecallerLogin, startTtlCountdown, stopTtlCountdown]);

  const verifyMissedCall = useCallback(async (
    firstName: string,
    lastName: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setVerificationStep('verifying');
      useAuthStore.setState({ isLoading: true, error: null });

      // In production, this would call:
      // TrueCallerSDK.verifyMissedCall(firstName, lastName, callback)
      // which triggers TYPE_VERIFICATION_COMPLETE callback with accessToken

      // For now, simulate the verification completing
      const accessToken = `tc_verified_${Date.now()}`;

      setVerificationStep('complete');
      await truecallerLogin({
        accessToken,
        phoneNumber,
        firstName,
        lastName,
      });

      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Verification failed';
      setVerificationStep('error');
      useAuthStore.setState({ isLoading: false });
      setError(message);
      return { success: false, error: message };
    }
  }, [truecallerLogin, setError]);

  const resetVerification = useCallback(() => {
    setVerificationStep('idle');
    stopTtlCountdown();
    setSdkError(null);
  }, [stopTtlCountdown]);

  return {
    isAvailable,
    isSdkReady,
    sdkError,
    verificationStep,
    ttl,
    signInWithTruecaller,
    requestMissedCallVerification,
    verifyMissedCall,
    resetVerification,
  };
}
