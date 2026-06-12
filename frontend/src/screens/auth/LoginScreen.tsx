import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { GoogleLoginButton } from '../../components/ui/GoogleLoginButton';
import { TruecallerLoginButton } from '../../components/ui/TruecallerLoginButton';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

export const LoginScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const { login, isLoading, error, clearError, pendingVerificationEmail } = useAuthStore();
    const { signInWithGoogle } = useGoogleAuth();

    const handleResendVerification = async () => {
        const target = pendingVerificationEmail || email.trim();
        if (!target) {
            Alert.alert(t('auth.emailRequiredAlert'), t('auth.enterEmailFirst'));
            return;
        }
        try {
            await authApi.resendVerification(target);
            Alert.alert(t('auth.verificationSent'), t('auth.verificationResentTo', { email: target }));
        } catch (err: any) {
            Alert.alert(t('common.error'), err.response?.data?.message || t('auth.couldNotResend'));
        }
    };

    const validate = (): boolean => {
        const newErrors: { email?: string; password?: string } = {};
        if (!email.trim()) newErrors.email = t('auth.emailRequired');
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('auth.emailInvalid');
        if (!password) newErrors.password = t('auth.passwordRequired');
        else if (password.length < 6) newErrors.password = t('auth.passwordTooShort');
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        clearError();
        try {
            const result = await login(email.trim(), password);
            if (result?.requires2FA && result.tempToken) {
                navigation.navigate('TwoFactorChallenge', { tempToken: result.tempToken });
            }
        } catch {
            // Error is set in the store
        }
    };

    const handleTruecallerPress = () => {
        clearError();
        navigation.navigate('TruecallerLogin');
    };

    return (
        <ScreenWrapper backgroundColor={theme.roles.light.primary} keyboardAvoiding>
            <View style={styles.header}>
                <Text style={styles.logo}>🦐</Text>
                <Text style={styles.title}>{t('auth.title')}</Text>
                <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
            </View>

            <View style={styles.card}>
                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {pendingVerificationEmail && (
                    <TouchableOpacity style={styles.verifyBanner} onPress={handleResendVerification}>
                        <Text style={styles.verifyText}>
                            {t('auth.verifyBanner', { email: pendingVerificationEmail })}
                        </Text>
                    </TouchableOpacity>
                )}

                <Input
                    label={t('auth.emailLabel')}
                    value={email}
                    onChangeText={setEmail}
                    error={errors.email}
                    placeholder={t('auth.emailPlaceholder')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon="email-outline"
                    required
                />

                <Input
                    label={t('auth.passwordLabel')}
                    value={password}
                    onChangeText={setPassword}
                    error={errors.password}
                    placeholder={t('auth.passwordPlaceholder')}
                    isPassword
                    leftIcon="lock-outline"
                    required
                />

                <Button
                    title={t('auth.signIn')}
                    onPress={handleLogin}
                    loading={isLoading}
                    style={styles.signInBtn}
                />

                <View style={styles.socialSection}>
                    <Text style={styles.socialLabel}>{t('auth.orContinueWith')}</Text>
                    <View style={styles.socialButtons}>
                        <GoogleLoginButton onPress={signInWithGoogle} loading={isLoading} />
                        {/* Truecaller SDK bridge is Android-only — hide the entry point elsewhere */}
                        {Platform.OS === 'android' && (
                            <TruecallerLoginButton
                                onPress={handleTruecallerPress}
                                loading={isLoading}
                            />
                        )}
                    </View>
                </View>

                <Button
                    title={t('auth.forgotPassword')}
                    onPress={() => navigation.navigate('ForgotPassword')}
                    variant="text"
                />

                <Button
                    title={t('auth.signInWithEmailCode')}
                    onPress={() => navigation.navigate('OtpLogin')}
                    variant="text"
                />

                <View style={styles.divider} />

                <Button
                    title={t('auth.createAccount')}
                    onPress={() => navigation.navigate('Register')}
                    variant="outlined"
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 32,
    },
    logo: {
        fontSize: 56,
        marginBottom: theme.spacing[3],
    },
    title: {
        ...theme.typeScale.h1,
        color: theme.roles.light.textInverse,
        marginBottom: theme.spacing[2],
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: 'rgba(255,255,255,0.8)',
    },
    card: {
        backgroundColor: theme.roles.light.surface,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        padding: theme.spacing[6],
        paddingTop: theme.spacing[8],
        flex: 1,
    },
    errorBanner: {
        backgroundColor: theme.roles.light.dangerBg,
        borderRadius: theme.radius.sm,
        padding: theme.spacing[4],
        marginBottom: theme.spacing[4],
        borderLeftWidth: 3,
        borderLeftColor: theme.roles.light.dangerText,
    },
    errorText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.dangerText,
    },
    verifyBanner: {
        backgroundColor: theme.roles.light.warningBg,
        borderRadius: theme.radius.sm,
        padding: theme.spacing[4],
        marginBottom: theme.spacing[4],
        borderLeftWidth: 3,
        borderLeftColor: theme.roles.light.warningText,
    },
    verifyText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.warningText,
    },
    signInBtn: {
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[3],
    },
    socialSection: {
        marginBottom: theme.spacing[4],
    },
    socialLabel: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing[3],
    },
    socialButtons: {
        gap: theme.spacing[3],
    },
    divider: {
        height: 1,
        backgroundColor: theme.roles.light.borderDefault,
        marginVertical: theme.spacing[4],
    },
});