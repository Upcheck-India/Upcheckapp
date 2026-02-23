import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';
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
                        style={{ marginTop: spacing.lg }}
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
                style={{ marginTop: spacing.sm }}
            />

            <Button
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
                variant="text"
                style={{ marginTop: spacing.md }}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
    },
    title: {
        ...typography.h1,
        color: Colors.textPrimary,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
        marginTop: spacing.sm,
        lineHeight: 22,
    },
    errorBanner: {
        backgroundColor: Colors.statusCriticalBg,
        borderRadius: radius.sm,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.error,
    },
    errorText: {
        ...typography.bodySmall,
        color: Colors.error,
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    successIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    successTitle: {
        ...typography.h2,
        color: Colors.textPrimary,
        marginBottom: spacing.sm,
    },
    successText: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
