import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, ProgressBar, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { AuthService } from '../../services/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Password Strength Calculator ────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    if (score <= 2) return { score: score / 6, label: 'Weak', color: Colors.error };
    if (score <= 4) return { score: score / 6, label: 'Fair', color: Colors.warning };
    return { score: score / 6, label: 'Strong', color: Colors.success };
}

const PASSWORD_RULES = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Number', test: (p: string) => /\d/.test(p) },
    { label: 'Special character (@$!%*?&)', test: (p: string) => /[@$!%*?&]/.test(p) },
];

const ResetPasswordScreen = ({ route, navigation }: any) => {
    // Expecting token and refreshToken specific args from deep link
    // or manually entered if we provide that option
    const [token, setToken] = useState(route.params?.token || '');
    const [refreshToken, setRefreshToken] = useState(route.params?.refreshToken || '');

    // Handle deep link hash parsing if params are missing (common with Supabase implicit flow)
    React.useEffect(() => {
        const handleDeepLink = async () => {
            // If we already have params via navigation linking, great.
            if (token && refreshToken) return;

            const url = await Linking.getInitialURL();
            if (url) {
                // Manual parsing to be safe for hash fragments
                if (url.includes('#')) {
                    const hash = url.split('#')[1];
                    // Simple parsing without URLSearchParams polyfill reliance
                    const params = hash.split('&').reduce((acc: any, part) => {
                        const [key, value] = part.split('=');
                        acc[decodeURIComponent(key)] = decodeURIComponent(value);
                        return acc;
                    }, {});

                    if (params.access_token) setToken(params.access_token);
                    if (params.refresh_token) setRefreshToken(params.refresh_token);
                }

                // Also check query params if expo-linking parsed them differently
                const { queryParams } = Linking.parse(url);
                if (queryParams?.token && !token) setToken(queryParams.token as string);
                if (queryParams?.refreshToken && !refreshToken) setRefreshToken(queryParams.refreshToken as string);
            }
        };
        handleDeepLink();
    }, []);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState('');
    const confirmRef = useRef<any>(null);

    const passwordStrength = getPasswordStrength(newPassword);
    const allRulesPassed = PASSWORD_RULES.every(r => r.test(newPassword));
    const confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    const passwordError = submitted && !newPassword ? 'Password is required' : '';
    const confirmError = submitted && !confirmPassword ? 'Please confirm your password' : '';

    const handleReset = async () => {
        setSubmitted(true);
        setServerError('');

        if (!newPassword || !confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        if (!allRulesPassed || confirmMismatch) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        if (!token || !refreshToken) {
            setServerError('Invalid or expired reset link. Please request a new one.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setLoading(true);
        try {
            await AuthService.resetPassword(token, refreshToken, newPassword);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Password has been reset. Please login with your new password.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setServerError(error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <MaterialCommunityIcons
                        name="shield-key"
                        size={64}
                        color={Colors.primary}
                        style={styles.icon}
                    />
                    <Text variant="headlineMedium" style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        Choose a strong new password for your account.
                    </Text>

                    {serverError ? (
                        <View style={styles.errorBanner}>
                            <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.error} />
                            <Text style={styles.errorBannerText}>{serverError}</Text>
                        </View>
                    ) : null}

                    <TextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={secureTextEntry}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmRef.current?.focus()}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="lock-plus" />}
                        right={
                            <TextInput.Icon
                                icon={secureTextEntry ? 'eye-off' : 'eye'}
                                onPress={() => setSecureTextEntry(!secureTextEntry)}
                            />
                        }
                        outlineColor={passwordError ? Colors.error : Colors.border}
                        activeOutlineColor={passwordError ? Colors.error : Colors.primary}
                        error={!!passwordError}
                    />
                    {passwordError ? <HelperText type="error" style={styles.helperText}>{passwordError}</HelperText> : null}

                    {/* Password Strength Bar + Requirements Checklist */}
                    {newPassword.length > 0 && (
                        <View style={styles.passwordFeedback}>
                            <View style={styles.strengthContainer}>
                                <ProgressBar
                                    progress={passwordStrength.score}
                                    color={passwordStrength.color}
                                    style={styles.strengthBar}
                                />
                                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                    {passwordStrength.label}
                                </Text>
                            </View>
                            <View style={styles.rulesContainer}>
                                {PASSWORD_RULES.map((rule, i) => {
                                    const passed = rule.test(newPassword);
                                    return (
                                        <View key={i} style={styles.ruleRow}>
                                            <MaterialCommunityIcons
                                                name={passed ? 'check-circle' : 'circle-outline'}
                                                size={14}
                                                color={passed ? Colors.success : Colors.grey}
                                            />
                                            <Text style={[styles.ruleText, passed && styles.ruleTextPassed]}>
                                                {rule.label}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    <TextInput
                        ref={confirmRef}
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={secureTextEntry}
                        returnKeyType="done"
                        onSubmitEditing={handleReset}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="lock-check" />}
                        outlineColor={confirmMismatch || confirmError ? Colors.error : Colors.border}
                        activeOutlineColor={confirmMismatch || confirmError ? Colors.error : Colors.primary}
                        error={!!confirmMismatch || !!confirmError}
                    />
                    {confirmMismatch ? (
                        <HelperText type="error" style={styles.helperText}>Passwords do not match</HelperText>
                    ) : confirmError ? (
                        <HelperText type="error" style={styles.helperText}>{confirmError}</HelperText>
                    ) : null}

                    <GradientButton
                        title="Set New Password"
                        onPress={handleReset}
                        loading={loading}
                        disabled={loading}
                        icon="lock-reset"
                        style={styles.button}
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
        padding: 24,
        flexGrow: 1,
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
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.errorLight,
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
    passwordFeedback: {
        marginBottom: 8,
        marginTop: 4,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.lightGrey,
    },
    strengthLabel: {
        marginLeft: 12,
        fontSize: 12,
        fontWeight: '700',
    },
    rulesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        paddingVertical: 2,
    },
    ruleText: {
        fontSize: 11,
        color: Colors.grey,
        marginLeft: 4,
    },
    ruleTextPassed: {
        color: Colors.textSecondary,
    },
    button: {
        marginTop: 16,
    },
});

export default ResetPasswordScreen;
