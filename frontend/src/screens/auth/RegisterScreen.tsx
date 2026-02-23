import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { GoogleLoginButton } from '../../components/ui/GoogleLoginButton';

export const RegisterScreen = ({ navigation }: any) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    const { signup, googleLogin, isLoading, error, clearError } = useAuthStore();

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!firstName.trim()) e.firstName = 'First name is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
        if (!password) e.password = 'Password is required';
        else if (password.length < 8) e.password = 'Password must be at least 8 characters';
        if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
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
                    <Text style={styles.successTitle}>Check Your Email</Text>
                    <Text style={styles.successText}>
                        We've sent a verification link to {email}. Please verify your email to continue.
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
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join UpCheck to manage your shrimp farms</Text>
            </View>

            {error && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                error={errors.firstName}
                placeholder="Enter your first name"
                autoCapitalize="words"
                leftIcon="account-outline"
                required
            />

            <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                error={errors.lastName}
                placeholder="Enter your last name"
                autoCapitalize="words"
                leftIcon="account-outline"
            />

            <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
                required
            />

            <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                placeholder="At least 8 characters"
                isPassword
                leftIcon="lock-outline"
                required
                hint="Min 8 characters"
            />

            <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                placeholder="Re-enter your password"
                isPassword
                leftIcon="lock-check-outline"
                required
            />

            <Button
                title="Create Account"
                onPress={handleRegister}
                loading={isLoading}
                style={{ marginTop: spacing.sm }}
            />

            <GoogleLoginButton onPress={googleLogin} loading={isLoading} />

            <Button
                title="Already have an account? Sign In"
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
        marginTop: spacing.xs,
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
