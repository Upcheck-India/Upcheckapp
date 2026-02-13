import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, ProgressBar, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { AuthService } from '../../services/auth';
import { GradientButton } from '../../components/GradientButton';
import { useAuthStore } from '../../store/authStore';
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
    const { accessToken, logout } = useAuthStore();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureOld, setSecureOld] = useState(true);
    const [secureNew, setSecureNew] = useState(true);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState('');
    const newRef = useRef<any>(null);
    const confirmRef = useRef<any>(null);

    const passwordStrength = getPasswordStrength(newPassword);
    const allRulesPassed = PASSWORD_RULES.every(r => r.test(newPassword));
    const confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const sameAsOld = newPassword.length > 0 && oldPassword.length > 0 && oldPassword === newPassword;

    const oldError = submitted && !oldPassword ? 'Current password is required' : '';
    const newError = submitted && !newPassword ? 'New password is required' : '';
    const confirmError = submitted && !confirmPassword ? 'Please confirm your new password' : '';

    const handleChangePassword = async () => {
        setSubmitted(true);
        setServerError('');

        if (!oldPassword || !newPassword || !confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        if (!allRulesPassed || confirmMismatch || sameAsOld) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setLoading(true);
        try {
            await AuthService.changePassword(accessToken!, oldPassword, newPassword);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Success',
                'Password changed successfully. Please login again.',
                [{ text: 'OK', onPress: () => logout() }]
            );
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setServerError(error.message || 'Failed to change password');
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
                    <Text variant="headlineMedium" style={styles.title}>Change Password</Text>
                    <Text style={styles.subtitle}>
                        Choose a strong password with at least 8 characters including uppercase, lowercase, number, and special character.
                    </Text>

                    {serverError ? (
                        <View style={styles.errorBanner}>
                            <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.error} />
                            <Text style={styles.errorBannerText}>{serverError}</Text>
                        </View>
                    ) : null}

                    <TextInput
                        label="Current Password"
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        secureTextEntry={secureOld}
                        returnKeyType="next"
                        onSubmitEditing={() => newRef.current?.focus()}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="lock" />}
                        right={
                            <TextInput.Icon
                                icon={secureOld ? 'eye-off' : 'eye'}
                                onPress={() => setSecureOld(!secureOld)}
                            />
                        }
                        outlineColor={oldError ? Colors.error : Colors.border}
                        activeOutlineColor={oldError ? Colors.error : Colors.primary}
                        error={!!oldError}
                    />
                    {oldError ? <HelperText type="error" style={styles.helperText}>{oldError}</HelperText> : null}

                    <TextInput
                        ref={newRef}
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={secureNew}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmRef.current?.focus()}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="lock-plus" />}
                        right={
                            <TextInput.Icon
                                icon={secureNew ? 'eye-off' : 'eye'}
                                onPress={() => setSecureNew(!secureNew)}
                            />
                        }
                        outlineColor={newError || sameAsOld ? Colors.error : Colors.border}
                        activeOutlineColor={newError || sameAsOld ? Colors.error : Colors.primary}
                        error={!!newError || sameAsOld}
                    />
                    {sameAsOld ? (
                        <HelperText type="error" style={styles.helperText}>Must be different from current password</HelperText>
                    ) : newError ? (
                        <HelperText type="error" style={styles.helperText}>{newError}</HelperText>
                    ) : null}

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

                    <GradientButton
                        title="Change Password"
                        onPress={handleChangePassword}
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
    button: {
        marginTop: 12,
    },
});

export default ChangePasswordScreen;
