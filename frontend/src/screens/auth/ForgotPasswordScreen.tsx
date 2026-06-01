import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export const ForgotPasswordScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const { forgotPassword, isLoading } = useAuthStore();

    const handleSend = async () => {
        if (!email.trim()) {
            setError(t('auth.emailRequired'));
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError(t('auth.emailInvalid'));
            return;
        }
        setError('');
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (err: any) {
            setError(err.message || t('auth.failedToSendReset'));
        }
    };

    if (sent) {
        return (
            <ScreenWrapper>
                <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>✉️</Text>
                    <Text style={styles.successTitle}>{t('auth.checkYourEmail')}</Text>
                    <Text style={styles.successText}>
                        {t('auth.passwordResetSent', { email })}
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
                <Text style={styles.title}>{t('auth.resetPassword')}</Text>
                <Text style={styles.subtitle}>
                    {t('auth.resetPasswordSubtitle')}
                </Text>
            </View>

            {error ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <Input
                label={t('auth.emailLabel')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
                required
            />

            <Button
                title={t('auth.sendResetLink')}
                onPress={handleSend}
                loading={isLoading}
                style={{ marginTop: theme.spacing[3] }}
            />

            <Button
                title={t('auth.backToLogin')}
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
        marginTop: theme.spacing[3],
        lineHeight: 22,
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
