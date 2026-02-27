import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export const ForgotPasswordScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const { forgotPassword, isLoading } = useAuthStore();

    const handleSend = async () => {
        if (!email.trim()) {
            setError('Email is required');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Enter a valid email');
            return;
        }
        setError('');
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        }
    };

    if (sent) {
        return (
            <ScreenWrapper>
                <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>✉️</Text>
                    <Text style={styles.successTitle}>Check Your Email</Text>
                    <Text style={styles.successText}>
                        We've sent a password reset link to {email}. Follow the instructions in the email to reset your password.
                    </Text>
                    <Button
                        title="Back to Login"
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
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                    Enter your email address and we'll send you a link to reset your password.
                </Text>
            </View>

            {error ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
                required
            />

            <Button
                title="Send Reset Link"
                onPress={handleSend}
                loading={isLoading}
                style={{ marginTop: theme.spacing[3] }}
            />

            <Button
                title="Back to Login"
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
