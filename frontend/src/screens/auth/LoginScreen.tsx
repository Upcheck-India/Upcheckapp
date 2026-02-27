import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { GoogleLoginButton } from '../../components/ui/GoogleLoginButton';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

export const LoginScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const { login, isLoading, error, clearError } = useAuthStore();
    const { signInWithGoogle } = useGoogleAuth();

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
        <ScreenWrapper backgroundColor={theme.roles.light.primary} keyboardAvoiding>
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

                <GoogleLoginButton onPress={signInWithGoogle} loading={isLoading} />

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
    signInBtn: {
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[3],
    },
    divider: {
        height: 1,
        backgroundColor: theme.roles.light.borderDefault,
        marginVertical: theme.spacing[4],
    },
});
