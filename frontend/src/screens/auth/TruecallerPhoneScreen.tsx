/**
 * TruecallerPhoneScreen — the "one-tap didn't work" off-ramp.
 *
 * History: this screen used to take a phone number and verify it with a
 * Truecaller drop-call (the "non-Truecaller user" flow). That flow needed
 * READ_CALL_LOG / ANSWER_PHONE_CALLS, and Play's July 2026 policy update
 * removed account verification by phone call as a permitted use of them
 * (deadline 14 Aug 2026). C0.1 removed the permissions, so the missed-call
 * route is gone — and with it the phone-number field, because a field that
 * cannot complete is worse than no field.
 *
 * What it does now: when Truecaller one-tap is unavailable (no Truecaller app,
 * not signed in, "use another number", non-Android), this screen offers the two
 * routes that DO complete today — email OTP (Supabase-backed, already live) and
 * Google — and never dead-ends.
 *
 * What is deliberately still wired: the verification event listener, the OTP
 * stage and `verifyOtp`. The native module can still emit TYPE_OTP_INITIATED /
 * TYPE_OTP_RECEIVED (the Truecaller-IM OTP, delivered inside the Truecaller
 * app), and nothing in the app starts that flow any more — but if such an event
 * ever arrives on a permission-free build, the screen completes instead of
 * dropping it. It is NOT a supported route and no copy promises it (spec
 * C0.1). If a device test shows an OTP genuinely arrives without the call-log
 * permissions, this is the hook to turn it back into a real route.
 *
 * Restoring a self-service phone sign-up (WhatsApp OTP, or SMS via an Indian
 * provider) is C0.1b — a future release, deliberately out of scope here.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GoogleLoginButton } from '../../components/ui/GoogleLoginButton';
import { theme } from '../../theme';
import { authApi, type AuthResponse } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { capture, EVENTS } from '../../features/analytics';
import { ConsentNotice } from '../../components/ui/ConsentNotice';
import {
    TruecallerAuth,
    type TruecallerVerificationEvent,
} from '../../native/TruecallerAuth';

type Stage = 'choose' | 'otp' | 'submitting';

export const TruecallerPhoneScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const setSession = useAuthStore((s) => s.setSession);
    const armSignupIntent = useAuthStore((s) => s.armSignupIntent);
    const { signInWithGoogle } = useGoogleAuth();

    const [stage, setStage] = useState<Stage>('choose');
    const [otp, setOtp] = useState('');
    const [ttl, setTtl] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Nothing in the UI collects these any more (see the header comment). They
    // stay so the retained OTP completion path behaves exactly as it did,
    // rather than being half-deleted.
    const phoneRef = useRef('');
    const firstNameRef = useRef('');
    const lastNameRef = useRef('');

    const handleAuthResponse = useCallback(
        (data: AuthResponse) => {
            if (data.requires2FA && data.tempToken) {
                navigation.navigate('TwoFactorChallenge', {
                    tempToken: data.tempToken,
                });
                return;
            }
            if (data.session) {
                setSession(data.session);
                // Reported HERE and not inside setSession: api/client.ts calls
                // setSession on every silent token refresh, so an event there
                // would count a refresh as a login.
                capture(EVENTS.LOGIN_COMPLETED, { method: 'truecaller' });
                // IntentScreen's answer. Only present when this flow began at
                // Register — see TruecallerLoginScreen for why arming is
                // conditional.
                if (route?.params?.intent) armSignupIntent(route.params.intent);
                return;
            }
            setError(
                t(
                    'auth.truecallerNoSession',
                    'The server did not return a session. Please try again.',
                ),
            );
            setStage('choose');
        },
        [navigation, setSession, armSignupIntent, route?.params?.intent, t],
    );

    const submitToken = useCallback(
        async (accessToken: string, fnFromSdk?: string, lnFromSdk?: string) => {
            setStage('submitting');
            try {
                const { data } = await authApi.truecallerMissedCall({
                    accessToken,
                    phoneNumber: `+91${phoneRef.current}`,
                    firstName:
                        firstNameRef.current.trim() || fnFromSdk?.trim() || 'User',
                    lastName:
                        lastNameRef.current.trim() || lnFromSdk?.trim() || undefined,
                });
                handleAuthResponse(data);
            } catch (err: unknown) {
                const serverMessage = (
                    err as { response?: { data?: { message?: string } } }
                )?.response?.data?.message;
                setError(
                    serverMessage ||
                        t('auth.tcVerificationFailed', 'Verification failed. Please try again.'),
                );
                setStage('choose');
            }
        },
        [handleAuthResponse, t],
    );

    // Registered once. Nothing in the app starts a verification any more, so in
    // practice this never fires — it stays so an unsolicited OTP / completion
    // event still lands somewhere that can finish the sign-in.
    useEffect(() => {
        const sub = TruecallerAuth.addVerificationListener(
            (e: TruecallerVerificationEvent) => {
                switch (e.status) {
                    case 'OTP_INITIATED':
                        setError(null);
                        setStage('otp');
                        setTtl(typeof e.ttl === 'number' ? e.ttl : null);
                        break;
                    case 'OTP_RECEIVED':
                        if (e.otp) setOtp(e.otp);
                        break;
                    case 'VERIFICATION_COMPLETE':
                    case 'PROFILE_VERIFIED_BEFORE':
                        if (e.accessToken) {
                            void submitToken(e.accessToken, e.firstName, e.lastName);
                        } else {
                            setError(
                                t(
                                    'auth.tcVerificationFailed',
                                    'Verification failed. Please try again.',
                                ),
                            );
                            setStage('choose');
                        }
                        break;
                    case 'ERROR':
                        setError(
                            e.message ||
                                t(
                                    'auth.tcVerificationFailed',
                                    'Verification failed. Please try again.',
                                ),
                        );
                        setStage('choose');
                        break;
                }
            },
        );
        return () => {
            sub.remove();
            TruecallerAuth.clear();
        };
    }, [submitToken, t]);

    // TTL countdown for the retained OTP state.
    useEffect(() => {
        if (ttl == null || ttl <= 0) return;
        const id = setInterval(() => {
            setTtl((v) => (v && v > 1 ? v - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [ttl]);

    const submitOtp = useCallback(async () => {
        const code = otp.replace(/\D/g, '');
        if (code.length < 4) {
            setError(t('auth.tcInvalidOtp', 'Enter the code you received.'));
            return;
        }
        setError(null);
        setStage('submitting');
        try {
            await TruecallerAuth.verifyOtp(
                firstNameRef.current.trim() || 'User',
                lastNameRef.current.trim(),
                code,
            );
            // VERIFICATION_COMPLETE arrives via the event listener.
        } catch {
            setError(
                t('auth.tcVerificationFailed', 'Verification failed. Please try again.'),
            );
            setStage('otp');
        }
    }, [otp, t]);

    const goToEmailOtp = useCallback(() => {
        navigation.navigate('OtpLogin');
    }, [navigation]);

    const handleGoogle = useCallback(async () => {
        setError(null);
        setGoogleLoading(true);
        try {
            // An `intent` param means we came from Register; Login passes none.
            // Mirrors LoginScreen, which passes 'signin' explicitly.
            const signupIntent = route?.params?.intent;
            const r = await signInWithGoogle(
                signupIntent ? 'signup' : 'signin',
                signupIntent,
            );
            if (r?.requires2FA && r.tempToken) {
                navigation.navigate('TwoFactorChallenge', {
                    tempToken: r.tempToken,
                });
            }
        } finally {
            setGoogleLoading(false);
        }
    }, [navigation, route?.params?.intent, signInWithGoogle]);

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.back', 'Back')}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={theme.roles.light.textPrimary}
                    />
                </TouchableOpacity>
                <Text style={styles.title}>
                    {t('auth.tcPhoneTitle', 'Another way to sign in')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {error && (
                    <View style={styles.statusBanner}>
                        <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={18}
                            color={theme.roles.light.dangerText}
                        />
                        <Text style={styles.statusBannerText}>{error}</Text>
                    </View>
                )}

                {stage === 'choose' && (
                    <Card style={styles.card}>
                        <Text style={styles.subtitle}>
                            {t(
                                'auth.tcPhoneSubtitle',
                                "Truecaller one-tap isn't available on this device. Sign in with your email or your Google account instead.",
                            )}
                        </Text>
                        <Button
                            title={t('auth.tcContinueWithEmail', 'Continue with email')}
                            onPress={goToEmailOtp}
                            style={styles.btn}
                        />
                        <GoogleLoginButton
                            onPress={handleGoogle}
                            loading={googleLoading}
                        />
                    </Card>
                )}

                {stage === 'submitting' && (
                    <Card style={[styles.card, styles.waitingCard]}>
                        <ActivityIndicator size="large" color={theme.roles.light.primary} />
                        <Text style={styles.waitingTitle}>
                            {t('auth.verifyingWithUpcheck')}
                        </Text>
                    </Card>
                )}

                {stage === 'otp' && (
                    <Card style={styles.card}>
                        <Text style={styles.subtitle}>
                            {t('auth.tcOtpBody', 'Enter the code Truecaller gave you.')}
                        </Text>
                        <Input
                            label={t('auth.otpLabel', 'OTP')}
                            value={otp}
                            onChangeText={setOtp}
                            placeholder="123456"
                            keyboardType="number-pad"
                            maxLength={8}
                            required
                        />
                        {ttl != null && ttl > 0 && (
                            <Text style={styles.ttlText}>
                                {t('auth.expiresIn', { seconds: ttl })}
                            </Text>
                        )}
                        <Button
                            title={t('auth.tcVerify', 'Verify')}
                            onPress={submitOtp}
                            style={styles.btn}
                        />
                    </Card>
                )}
                <ConsentNotice navigation={navigation} />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    content: { padding: theme.spacing[4] },
    card: { marginBottom: theme.spacing[6] },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[4],
    },
    btn: { marginTop: theme.spacing[3] },
    waitingCard: {
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[8],
    },
    waitingTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
        textAlign: 'center',
    },
    ttlText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textTertiary,
        textAlign: 'center',
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing[2],
        backgroundColor: theme.roles.light.dangerBg,
        borderLeftWidth: 3,
        borderLeftColor: theme.roles.light.dangerText,
        borderRadius: theme.radius.sm,
        padding: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    statusBannerText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.dangerText,
        flex: 1,
    },
});

export default TruecallerPhoneScreen;
