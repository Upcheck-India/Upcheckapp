import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, ProgressBar, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
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

// ─── Password Requirements ───────────────────────────────────────
const PASSWORD_RULES = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Number', test: (p: string) => /\d/.test(p) },
    { label: 'Special character (@$!%*?&)', test: (p: string) => /[@$!%*?&]/.test(p) },
];

const RegisterScreen = ({ navigation }: any) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState('');
    const emailRef = useRef<any>(null);
    const phoneRef = useRef<any>(null);
    const passwordRef = useRef<any>(null);
    const confirmRef = useRef<any>(null);

    const { register } = useAuthStore();

    const passwordStrength = getPasswordStrength(password);
    const allRulesPassed = PASSWORD_RULES.every(r => r.test(password));
    const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;

    // ─── Inline Validation ────────────────────────────────────
    const nameError = submitted && !fullName.trim() ? 'Full name is required' : '';
    const emailError = submitted && !email.trim() ? 'Email is required' : '';
    const passwordError = submitted && !password ? 'Password is required' : '';
    const confirmError = submitted && !confirmPassword ? 'Please confirm your password' : '';

    const handleRegister = async () => {
        setSubmitted(true);
        setServerError('');

        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        if (!allRulesPassed) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        if (password !== confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setLoading(true);
        try {
            await register(email.trim(), password, fullName.trim(), phoneNumber.trim() || undefined);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Registration Successful',
                'Please check your email for a verification link before signing in.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setServerError(error.message || 'Could not create account');
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
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Text variant="headlineMedium" style={styles.headerTitle}>Create Account</Text>
                        <Text variant="bodyMedium" style={styles.headerSubtitle}>
                            Join Upcheck to manage your farm
                        </Text>
                    </LinearGradient>

                    <View style={styles.content}>
                        {/* Server Error Banner */}
                        {serverError ? (
                            <View style={styles.errorBanner}>
                                <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.error} />
                                <Text style={styles.errorBannerText}>{serverError}</Text>
                            </View>
                        ) : null}

                        <TextInput
                            label="Full Name *"
                            value={fullName}
                            onChangeText={setFullName}
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="account" />}
                            outlineColor={nameError ? Colors.error : Colors.border}
                            activeOutlineColor={nameError ? Colors.error : Colors.primary}
                            error={!!nameError}
                        />
                        {nameError ? <HelperText type="error" style={styles.helperText}>{nameError}</HelperText> : null}

                        <TextInput
                            ref={emailRef}
                            label="Email Address *"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            returnKeyType="next"
                            onSubmitEditing={() => phoneRef.current?.focus()}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="email" />}
                            outlineColor={emailError ? Colors.error : Colors.border}
                            activeOutlineColor={emailError ? Colors.error : Colors.primary}
                            error={!!emailError}
                        />
                        {emailError ? <HelperText type="error" style={styles.helperText}>{emailError}</HelperText> : null}

                        <TextInput
                            ref={phoneRef}
                            label="Phone Number (optional)"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="phone" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

                        <TextInput
                            ref={passwordRef}
                            label="Password *"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secureTextEntry}
                            returnKeyType="next"
                            onSubmitEditing={() => confirmRef.current?.focus()}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="lock" />}
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

                        {/* Password Strength Bar + Requirements Checklist */}
                        {password.length > 0 && (
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
                                        const passed = rule.test(password);
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
                            label="Confirm Password *"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={secureTextEntry}
                            returnKeyType="done"
                            onSubmitEditing={handleRegister}
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
                            title="Create Account"
                            onPress={handleRegister}
                            loading={loading}
                            disabled={loading}
                            icon="account-plus"
                            style={styles.registerButton}
                        />

                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={styles.loginLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: Colors.textLight,
        marginBottom: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 24,
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
    registerButton: {
        marginTop: 12,
        marginBottom: 16,
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    loginText: {
        color: Colors.textSecondary,
        fontSize: 15,
    },
    loginLink: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
});

export default RegisterScreen;
