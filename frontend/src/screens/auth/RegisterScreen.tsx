import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { GoogleLoginButton } from '../../components/ui/GoogleLoginButton';
import { TruecallerLoginButton } from '../../components/ui/TruecallerLoginButton';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useTruecallerAuth } from '../../hooks/useTruecallerAuth';

export const RegisterScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    const { signup, isLoading, error, clearError } = useAuthStore();
    const { signInWithGoogle } = useGoogleAuth();
    const { signInWithTruecaller, isAvailable: isTruecallerAvailable } = useTruecallerAuth();

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!firstName.trim()) e.firstName = t('auth.firstNameRequired');
        if (!email.trim()) e.email = t('auth.emailRequired');
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('auth.emailInvalid');
        if (!password) e.password = t('auth.passwordRequired');
        else if (password.length < 8) e.password = t('auth.passwordTooShortRegister');
        if (password !== confirmPassword) e.confirmPassword = t('auth.passwordsDoNotMatch');
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        clearError();
        try {
            await signup(email.trim(), password, firstName.trim(), lastName.trim());
            setSuccess(true);
        } catch {
            // Error is set in the store
        }
    };

    if (success) {
        return (
            <ScreenWrapper>
                <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>📧</Text>
                    <Text style={styles.successTitle}>{t('auth.checkYourEmail')}</Text>
                    <Text style={styles.successText}>
                        {t('auth.verificationLinkSent', { email })}
                    </Text>
                    <Button
                        title={t('auth.backToLogin')}
                        onPress={() => navigation.navigate('Login')}
                        style={{ marginTop: theme.spacing[6] }}
                    />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={styles.title}>{t('auth.createAccountTitle')}</Text>
                <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
            </View>

            {error && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <Input
                label={t('auth.firstNameLabel')}
                value={firstName}
                onChangeText={setFirstName}
                error={errors.firstName}
                placeholder={t('auth.firstNamePlaceholder')}
                autoCapitalize="words"
                leftIcon="account-outline"
                required
            />

            <Input
                label={t('auth.lastNameLabel')}
                value={lastName}
                onChangeText={setLastName}
                error={errors.lastName}
                placeholder={t('auth.lastNamePlaceholder')}
                autoCapitalize="words"
                leftIcon="account-outline"
            />

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
                placeholder={t('auth.passwordAtLeast8Placeholder')}
                isPassword
                leftIcon="lock-outline"
                required
                hint={t('auth.passwordHint')}
            />

            <Input
                label={t('auth.confirmPasswordLabel')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                isPassword
                leftIcon="lock-check-outline"
                required
            />

            <Button
                title={t('auth.createAccount')}
                onPress={handleRegister}
                loading={isLoading}
                style={{ marginTop: theme.spacing[3] }}
            />

            <Text style={styles.consent}>
                {t('auth.consentPrefix')}{' '}
                <Text style={styles.consentLink} onPress={() => navigation.navigate('Terms')}>
                    {t('settings.termsOfService')}
                </Text>
                {' '}{t('auth.consentAnd')}{' '}
                <Text style={styles.consentLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                    {t('settings.privacyPolicy')}
                </Text>.
            </Text>

            <GoogleLoginButton onPress={signInWithGoogle} loading={isLoading} />

            {isTruecallerAvailable && (
                <TruecallerLoginButton
                    onPress={signInWithTruecaller}
                    loading={isLoading}
                />
            )}

            <Button
                title={t('auth.alreadyHaveAccount')}
                onPress={() => navigation.navigate('Login')}
                variant="text"
                style={{ marginTop: theme.spacing[4] }}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: theme.spacing[8],
        paddingBottom: theme.spacing[6],
    },
    title: {
        ...theme.typeScale.h1,
        color: theme.roles.light.textPrimary,
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[2],
    },
    consent: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing[3],
        marginHorizontal: theme.spacing[2],
    },
    consentLink: {
        color: theme.roles.light.primary,
        textDecorationLine: 'underline',
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
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing[8],
    },
    successIcon: {
        fontSize: 64,
        marginBottom: theme.spacing[4],
    },
    successTitle: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    successText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
