import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, ProgressBar, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { GradientButton } from '../../components/GradientButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

const ChangePasswordScreen = ({ navigation }: any) => {
    const { logout, changePassword, forgotPassword, user } = useAuth();

    // Step 1: verify current credentials
    const [step, setStep] = useState<1 | 2>(1);
    const [currentEmail, setCurrentEmail] = useState(user?.email ?? '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [secureCurrentPw, setSecureCurrentPw] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');

    // Step 2: new password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureNew, setSecureNew] = useState(true);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState('');
    const confirmRef = useRef<any>(null);

    const passwordStrength = getPasswordStrength(newPassword);
    const allRulesPassed = PASSWORD_RULES.every(r => r.test(newPassword));
    const confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const confirmError = submitted && !confirmPassword ? 'Please confirm your password' : '';

    const handleVerifyCurrentPassword = async () => {
        if (!currentEmail.trim() || !currentPassword) {
            setVerifyError('Please enter your email and current password.');
            return;
        }
        setVerifying(true);
        setVerifyError('');
        try {
            // Use a temporary client with no session persistence so it does NOT
            // fire onAuthStateChange on the global supabase client (which would
            // reset the navigation stack to the home screen).
            const { createClient } = await import('@supabase/supabase-js');
            const Constants = (await import('expo-constants')).default;
            const url = Constants.expoConfig?.extra?.supabaseUrl ?? '';
            const key = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';
            const tempClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
            const { error } = await tempClient.auth.signInWithPassword({
                email: currentEmail.trim().toLowerCase(),
                password: currentPassword,
            });
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStep(2);
        } catch (e: any) {
            setVerifyError(e.message || 'Incorrect email or password.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setVerifying(false);
        }
    };

    const handleForgotPassword = async () => {
        const email = currentEmail.trim() || user?.email;
        if (!email) { Alert.alert('Email required', 'Enter your email address above first.'); return; }
        try {
            await forgotPassword(email);
            Alert.alert('Reset email sent', `Check your inbox at ${email} for a password reset link.`);
        } catch (e: any) { Alert.alert('Error', e.message); }
    };

    const handleChangePassword = async () => {
        setSubmitted(true);
        setServerError('');
        if (!newPassword || !confirmPassword) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
        if (!allRulesPassed || confirmMismatch) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
        setLoading(true);
        try {
            await changePassword(newPassword);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Password Changed', 'Your password has been updated. Please sign in again.', [{ text: 'OK', onPress: () => logout() }]);
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setServerError(error.message || 'Failed to change password');
        } finally { setLoading(false); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Step indicators */}
                    <View style={styles.stepRow}>
                        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                        <View style={styles.stepLine} />
                        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                    </View>

                    {step === 1 ? (
                        <>
                            <Text variant="headlineMedium" style={styles.title}>Verify Identity</Text>
                            <Text style={styles.subtitle}>Confirm your current email and password before setting a new one.</Text>

                            {verifyError ? <View style={styles.errorBanner}><MaterialCommunityIcons name="alert-circle" size={18} color={Colors.error} /><Text style={styles.errorBannerText}>{verifyError}</Text></View> : null}

                            <TextInput label="Email" value={currentEmail} onChangeText={setCurrentEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" left={<TextInput.Icon icon="email-outline" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                            <TextInput label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={secureCurrentPw} mode="outlined" style={styles.input} left={<TextInput.Icon icon="lock-outline" />} right={<TextInput.Icon icon={secureCurrentPw ? 'eye-off' : 'eye'} onPress={() => setSecureCurrentPw(!secureCurrentPw)} />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} onSubmitEditing={handleVerifyCurrentPassword} returnKeyType="done" />

                            <GradientButton title="Verify & Continue" onPress={handleVerifyCurrentPassword} loading={verifying} disabled={verifying} icon="arrow-right" style={styles.button} />

                            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
                                <MaterialCommunityIcons name="help-circle-outline" size={16} color={Colors.primary} />
                                <Text style={styles.forgotText}>Forgot your password? Send reset email</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text variant="headlineMedium" style={styles.title}>New Password</Text>
                            <Text style={styles.subtitle}>Choose a strong new password.</Text>

                            {serverError ? <View style={styles.errorBanner}><MaterialCommunityIcons name="alert-circle" size={18} color={Colors.error} /><Text style={styles.errorBannerText}>{serverError}</Text></View> : null}

                            <TextInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry={secureNew} returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} mode="outlined" style={styles.input} left={<TextInput.Icon icon="lock-plus" />} right={<TextInput.Icon icon={secureNew ? 'eye-off' : 'eye'} onPress={() => setSecureNew(!secureNew)} />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                            {submitted && !newPassword ? <HelperText type="error">New password is required</HelperText> : null}

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
                        secureTextEntry={secureNew}
                        returnKeyType="done"
                        onSubmitEditing={handleChangePassword}
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

                            <GradientButton title="Change Password" onPress={handleChangePassword} loading={loading} disabled={loading} icon="lock-reset" style={styles.button} />
                        </>
                    )}
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
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: Colors.text,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
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
    button: { marginTop: 12 },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.lightGrey },
    stepDotActive: { backgroundColor: Colors.primary },
    stepLine: { width: 40, height: 2, backgroundColor: Colors.lightGrey, marginHorizontal: 8 },
    forgotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 6 },
    forgotText: { color: Colors.primary, fontSize: 13, fontWeight: '500' },
});

export default ChangePasswordScreen;
