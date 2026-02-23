import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { GoogleLoginButton } from '../../components/ui/GoogleLoginButton';

export const LoginScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const { login, googleLogin, isLoading, error, clearError } = useAuthStore();

    const validate = (): boolean => {
        const newErrors: { email?: string; password?: string } = {};
        if (!email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
        if (!password) newErrors.password = 'Password is required';
        else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        clearError();
        try {
            await login(email.trim(), password);
        } catch {
            // Error is set in the store
        }
    };

    return (
        <ScreenWrapper backgroundColor={Colors.primary} keyboardAvoiding>
            <View style={styles.header}>
                <Text style={styles.logo}>🦐</Text>
                <Text style={styles.title}>UpCheck</Text>
                <Text style={styles.subtitle}>Shrimp Aquaculture Management</Text>
            </View>

            <View style={styles.card}>
                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

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
                    placeholder="Enter your password"
                    isPassword
                    leftIcon="lock-outline"
                    required
                />

                <Button
                    title="Sign In"
                    onPress={handleLogin}
                    loading={isLoading}
                    style={styles.signInBtn}
                />

                <GoogleLoginButton onPress={googleLogin} loading={isLoading} />

                <Button
                    title="Forgot Password?"
                    onPress={() => navigation.navigate('ForgotPassword')}
                    variant="text"
                />

                <View style={styles.divider} />

                <Button
                    title="Create Account"
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
        marginBottom: spacing.sm,
    },
    title: {
        ...typography.h1,
        color: Colors.textInverse,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: 'rgba(255,255,255,0.8)',
    },
    card: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        paddingTop: spacing.xl,
        flex: 1,
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
    signInBtn: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.divider,
        marginVertical: spacing.md,
    },
});
