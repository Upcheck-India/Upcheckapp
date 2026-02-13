import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { AuthService } from '../../services/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ForgotPasswordScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState('');
    const [sent, setSent] = useState(false);

    const emailError = submitted && !email.trim() ? 'Email address is required' : '';

    // Clear server error when user types
    useEffect(() => {
        if (serverError) setServerError('');
    }, [email]);

    const handleReset = async () => {
        setSubmitted(true);
        setServerError('');

        if (!email.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setLoading(true);
        try {
            await AuthService.forgotPassword(email.trim());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSent(true);
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setServerError(error.message || 'Failed to request reset');
        } finally {
            setLoading(false);
        }
    };

    // ─── Success State ────────────────────────────────────────
    if (sent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <MaterialCommunityIcons
                        name="email-check"
                        size={64}
                        color={Colors.success}
                        style={styles.icon}
                    />
                    <Text variant="headlineMedium" style={styles.title}>Check Your Email</Text>
                    <Text style={styles.subtitle}>
                        If an account exists for {email.trim()}, we've sent password reset instructions to your inbox.
                    </Text>
                    <Text style={styles.hint}>
                        Didn't receive it? Check your spam folder or try again.
                    </Text>

                    <GradientButton
                        title="Back to Login"
                        onPress={() => navigation.navigate('Login')}
                        icon="login"
                        style={styles.button}
                    />

                    <GradientButton
                        title="Try Again"
                        onPress={() => { setSent(false); setSubmitted(false); }}
                        variant="secondary"
                        style={styles.secondaryButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    // ─── Form State ───────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <MaterialCommunityIcons
                        name="lock-reset"
                        size={64}
                        color={Colors.primary}
                        style={styles.icon}
                    />
                    <Text variant="headlineMedium" style={styles.title}>Forgot Password</Text>
                    <Text style={styles.subtitle}>
                        Enter your email address and we'll send you instructions to reset your password.
                    </Text>

                    {serverError ? (
                        <View style={styles.errorBanner}>
                            <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.error} />
                            <Text style={styles.errorBannerText}>{serverError}</Text>
                        </View>
                    ) : null}

                    <TextInput
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={handleReset}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="email" />}
                        outlineColor={emailError ? Colors.error : Colors.border}
                        activeOutlineColor={emailError ? Colors.error : Colors.primary}
                        error={!!emailError}
                    />
                    {emailError ? <HelperText type="error" style={styles.helperText}>{emailError}</HelperText> : null}

                    <GradientButton
                        title="Send Reset Link"
                        onPress={handleReset}
                        loading={loading}
                        disabled={loading}
                        icon="email-fast"
                        style={styles.button}
                    />

                    <GradientButton
                        title="Back to Login"
                        onPress={() => navigation.goBack()}
                        variant="secondary"
                        style={styles.secondaryButton}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    icon: {
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: Colors.text,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    hint: {
        textAlign: 'center',
        marginBottom: 32,
        color: Colors.grey,
        fontSize: 13,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorBannerText: {
        color: Colors.error,
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    input: {
        marginBottom: 2,
        backgroundColor: Colors.surface,
    },
    helperText: {
        marginBottom: 4,
        marginTop: -2,
    },
    button: {
        marginTop: 16,
    },
    secondaryButton: {
        marginTop: 12,
    },
});

export default ForgotPasswordScreen;
