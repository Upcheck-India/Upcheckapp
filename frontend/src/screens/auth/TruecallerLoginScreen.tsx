/**
 * TruecallerLoginScreen — Truecaller OAuth 2.0 "One-Tap" sign-in.
 *
 * Flow:
 *   1. `TruecallerAuth.authenticate()` drives the native SDK and returns an
 *      authorization code + PKCE `codeVerifier` + `state`.
 *   2. Those are POSTed to `/auth/supabase/oauth/truecaller/exchange`, where
 *      the backend completes the server-to-server exchange and returns a
 *      Supabase session.
 *   3. The session is stored; RootNavigator swaps to the authed stack as soon
 *      as `isAuthenticated` flips true.
 *
 * Trust boundary: nothing here authorizes the user — the backend exchange is
 * the only component that verifies the Truecaller identity.
 *
 * The legacy OTP / missed-call manual flow has been removed: the OAuth SDK
 * does not support it, and the previous event-based implementation was wired
 * to no-op stubs.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { TruecallerLoginButton } from '../../components/ui/TruecallerLoginButton';
import { theme } from '../../theme';
import { TruecallerAuth, type TruecallerErrorCode } from '../../native/TruecallerAuth';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

const EMAIL_LOGIN_ROUTE = 'Login';

export interface TruecallerLoginScreenProps {
    navigation: {
        navigate: (route: string, params?: object) => void;
        replace: (route: string, params?: object) => void;
        goBack: () => void;
    };
}

/** Human-readable copy for the non-cancel failure codes. */
function messageForError(error: TruecallerErrorCode): string {
    switch (error) {
        case 'ERROR_TC_NOT_USABLE':
            return 'Truecaller is not available on this device. Make sure the Truecaller app is installed and signed in, or continue with email.';
        case 'ERROR_PLATFORM_UNSUPPORTED':
            return 'Truecaller sign-in is only available on Android. Please continue with email.';
        case 'ERROR_NETWORK':
            return 'Network error. Check your connection and try again.';
        case 'ERROR_SDK_NOT_INITIALIZED':
            return 'Could not start Truecaller. Please try again.';
        default:
            return 'Truecaller sign-in failed. Please try again or continue with email.';
    }
}

export const TruecallerLoginScreen: React.FC<TruecallerLoginScreenProps> = ({
    navigation,
}) => {
    const { t } = useTranslation();
    const setSession = useAuthStore((s) => s.setSession);

    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Warm up the SDK so the first tap is responsive. Best-effort.
    useEffect(() => {
        void TruecallerAuth.initialize();
    }, []);

    const handleStartAuth = useCallback(async () => {
        setStatusMessage(null);
        setLoading(true);
        try {
            const result = await TruecallerAuth.authenticate();

            if (!result.successful) {
                // Silent for an explicit user cancel; surface everything else.
                if (result.error !== 'ERROR_USER_CANCELLED') {
                    setStatusMessage(messageForError(result.error));
                }
                return;
            }

            const { data } = await authApi.truecallerExchange({
                authorizationCode: result.authorizationCode,
                codeVerifier: result.codeVerifier,
                state: result.state,
            });

            if (data.requires2FA && data.tempToken) {
                navigation.navigate('TwoFactorChallenge', { tempToken: data.tempToken });
                return;
            }
            if (data.session) {
                // RootNavigator swaps stacks on isAuthenticated; no explicit nav.
                setSession(data.session);
                return;
            }
            Alert.alert(
                t('auth.loginFailed'),
                'The server did not return a session. Please try again.',
            );
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            const serverMessage = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            if (status && status >= 400 && status < 500) {
                Alert.alert(
                    t('auth.loginFailed'),
                    serverMessage || 'Truecaller verification failed. Please try again.',
                );
            } else {
                Alert.alert(
                    t('auth.networkError'),
                    serverMessage || 'Could not reach the server. Please try again.',
                );
            }
        } finally {
            setLoading(false);
        }
    }, [setSession, t]);

    const handleEmailLoginPress = useCallback(() => {
        navigation.navigate(EMAIL_LOGIN_ROUTE);
    }, [navigation]);

    return (
        <ScreenWrapper keyboardAvoiding>
            <View style={styles.header}>
                <MaterialCommunityIcons
                    name="phone-check"
                    size={48}
                    color={theme.roles.light.primary}
                />
                <Text style={styles.title}>{t('auth.truecallerTitle')}</Text>
                <Text style={styles.subtitle}>{t('auth.truecallerSubtitle')}</Text>
            </View>

            {statusMessage && (
                <View style={styles.statusBanner}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={18}
                        color={theme.roles.light.dangerText}
                    />
                    <Text style={styles.statusBannerText}>{statusMessage}</Text>
                </View>
            )}

            {loading ? (
                <View style={[styles.section, styles.verifyingSection]}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                    <Text style={styles.verifyingText}>
                        {t('auth.verifyingWithUpcheck')}
                    </Text>
                </View>
            ) : (
                <View style={styles.section}>
                    <TruecallerLoginButton onPress={handleStartAuth} loading={false} />
                </View>
            )}

            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handleEmailLoginPress}
                    accessibilityRole="link"
                    accessibilityLabel={t('auth.signInWithEmail')}
                    style={styles.emailLink}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <MaterialCommunityIcons
                        name="email-outline"
                        size={18}
                        color={theme.roles.light.primary}
                    />
                    <Text style={styles.emailLinkText}>{t('auth.signInWithEmail')}</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        paddingTop: theme.spacing[6],
        paddingBottom: theme.spacing[6],
    },
    title: {
        ...theme.typeScale.h1,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[2],
        textAlign: 'center',
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    section: {
        paddingVertical: theme.spacing[2],
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
    verifyingSection: {
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[8],
    },
    verifyingText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    footer: {
        marginTop: theme.spacing[6],
        alignItems: 'center',
    },
    emailLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
    },
    emailLinkText: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.primary,
    },
});

export default TruecallerLoginScreen;
