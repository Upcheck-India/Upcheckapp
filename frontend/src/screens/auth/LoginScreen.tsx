import React, { useEffect, useState, useRef } from 'react';
import Constants from 'expo-constants';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput, Checkbox, Divider, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Prompt } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }: any) => {
    // ─── Google Auth ─────────────────────────────────────────
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: Constants.expoConfig?.extra?.googleClientIdWeb,
        iosClientId: Constants.expoConfig?.extra?.googleClientIdIos,
        androidClientId: Constants.expoConfig?.extra?.googleClientIdAndroid,
        prompt: Prompt.SelectAccount,
    });

    // ─── State ───────────────────────────────────────────────
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState('');
    const passwordRef = useRef<any>(null);

    const { isLoading: loading, googleLogin, emailLogin, error, clearError } = useAuthStore();

    // ─── Inline Validation ────────────────────────────────────
    const emailError = submitted && !emailOrPhone.trim() ? 'Email or phone is required' : '';
    const passwordError = submitted && !password ? 'Password is required' : '';

    // ─── Google Response Handler ─────────────────────────────
    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            handleGoogleLogin(id_token);
        } else if (response?.type === 'error') {
            Alert.alert('Authentication Error', 'Failed to sign in with Google');
        }
    }, [response]);

    // Clear errors when screen focuses
    useEffect(() => {
        clearError();
    }, []);

    // Clear server error when user types
    useEffect(() => {
        if (serverError) setServerError('');
    }, [emailOrPhone, password]);

    const handle2FARedirect = (data: any) => {
        if (data?.requires2fa) {
            navigation.navigate('TwoFALogin', { tempToken: data.temp_token });
        }
    };

    const handleGoogleLogin = async (token: string) => {
        setGoogleLoading(true);
        try {
            const data = await googleLogin(token);
            handle2FARedirect(data);
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Could not verify user');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleEmailLogin = async () => {
        setSubmitted(true);
        setServerError('');
        if (!emailOrPhone.trim() || !password) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setEmailLoading(true);
        try {
            const data = await emailLogin(emailOrPhone.trim(), password, rememberMe);
            handle2FARedirect(data);
        } catch (error: any) {
            const msg = error.message || 'Invalid credentials';
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('email not verified')) {
                Alert.alert('Email Not Verified', msg, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Resend Email',
                        onPress: () => {
                            const { AuthService } = require('../../services/auth');
                            AuthService.resendVerificationEmail(emailOrPhone.trim())
                                .then(() => Alert.alert('Sent', 'Verification email resent. Please check your inbox.'))
                                .catch(() => Alert.alert('Error', 'Failed to resend verification email'));
                        },
                    },
                ]);
            } else {
                setServerError(msg);
            }
        } finally {
            setEmailLoading(false);
        }
    };

    const handleSocialPress = (action: () => void) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        action();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Text variant="headlineMedium" style={styles.headerTitle}>Welcome to Upcheck</Text>
                        <Text variant="bodyMedium" style={styles.headerSubtitle}>
                            Smart Farm Management
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

                        {/* Email/Password Form */}
                        <TextInput
                            label="Email or Phone"
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="account" />}
                            outlineColor={emailError ? Colors.error : Colors.border}
                            activeOutlineColor={emailError ? Colors.error : Colors.primary}
                            error={!!emailError}
                        />
                        {emailError ? <HelperText type="error" style={styles.helperText}>{emailError}</HelperText> : null}

                        <TextInput
                            ref={passwordRef}
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secureTextEntry}
                            returnKeyType="done"
                            onSubmitEditing={handleEmailLogin}
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
                        {passwordError ? <HelperText type="error" style={styles.helperText}>{passwordError}</HelperText> : null}

                        {/* Remember Me + Forgot Password Row */}
                        <View style={styles.optionsRow}>
                            <TouchableOpacity
                                style={styles.rememberRow}
                                onPress={() => setRememberMe(!rememberMe)}
                            >
                                <Checkbox
                                    status={rememberMe ? 'checked' : 'unchecked'}
                                    onPress={() => setRememberMe(!rememberMe)}
                                    color={Colors.primary}
                                />
                                <Text style={styles.rememberText}>Remember me</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <GradientButton
                            title="Sign In"
                            onPress={handleEmailLogin}
                            loading={emailLoading}
                            disabled={emailLoading || loading}
                            icon="login"
                            style={styles.loginButton}
                        />

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <Divider style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <Divider style={styles.dividerLine} />
                        </View>

                        {/* Social Login Buttons */}
                        <TouchableOpacity
                            style={[styles.socialButton, styles.googleButton, (!request || loading || googleLoading) && styles.socialButtonDisabled]}
                            onPress={() => handleSocialPress(() => promptAsync())}
                            disabled={!request || loading || googleLoading}
                        >
                            {googleLoading ? (
                                <ActivityIndicator size={20} color="#DB4437" />
                            ) : (
                                <MaterialCommunityIcons name="google" size={22} color="#DB4437" />
                            )}
                            <Text style={styles.socialButtonText}>
                                {googleLoading ? 'Signing in...' : 'Continue with Google'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, styles.phoneButton, (loading || googleLoading) && styles.socialButtonDisabled]}
                            onPress={() => handleSocialPress(() => navigation.navigate('PhoneLogin'))}
                            disabled={loading || googleLoading}
                        >
                            <MaterialCommunityIcons name="cellphone" size={22} color={Colors.primary} />
                            <Text style={styles.socialButtonText}>Continue with Phone</Text>
                        </TouchableOpacity>

                        {/* Register Link */}
                        <View style={styles.registerRow}>
                            <Text style={styles.registerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.registerLink}>Sign Up</Text>
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
        paddingVertical: 48,
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
        paddingTop: 28,
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
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rememberText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    forgotText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        marginBottom: 24,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        marginHorizontal: 16,
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    googleButton: {
        borderColor: '#DB4437',
        backgroundColor: '#FFF',
    },
    phoneButton: {
        borderColor: Colors.primary,
        backgroundColor: '#FFF',
    },
    socialButtonDisabled: {
        opacity: 0.5,
    },
    socialButtonText: {
        marginLeft: 10,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    registerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 16,
    },
    registerText: {
        color: Colors.textSecondary,
        fontSize: 15,
    },
    registerLink: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
});

export default LoginScreen;
