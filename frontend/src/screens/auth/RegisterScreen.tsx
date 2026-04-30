import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
                        style={{ marginTop: theme.spacing[6] }}
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
                style={{ marginTop: theme.spacing[3] }}
            />

            <GoogleLoginButton onPress={signInWithGoogle} loading={isLoading} />

            {isTruecallerAvailable && (
                <TruecallerLoginButton
                    onPress={signInWithTruecaller}
                    loading={isLoading}
                />
            )}

            <Button
                title="Already have an account? Sign In"
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
