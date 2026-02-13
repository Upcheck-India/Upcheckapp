import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Checkbox, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
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

    const { isLoading: loading, googleLogin, emailLogin, error, clearError } = useAuthStore();

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

    const handle2FARedirect = (data: any) => {
        if (data?.requires2fa) {
            navigation.navigate('TwoFALogin', { tempToken: data.temp_token });
        }
    };

    const handleGoogleLogin = async (token: string) => {
        try {
            const data = await googleLogin(token);
            handle2FARedirect(data);
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Could not verify user');
        }
    };

    const handleEmailLogin = async () => {
        if (!emailOrPhone.trim()) {
            Alert.alert('Error', 'Please enter your email or phone number');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setEmailLoading(true);
        try {
            const data = await emailLogin(emailOrPhone.trim(), password, rememberMe);
            handle2FARedirect(data);
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials');
        } finally {
            setEmailLoading(false);
        }
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
                        {/* Email/Password Form */}
                        <TextInput
                            label="Email or Phone"
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="account" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secureTextEntry}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="lock" />}
                            right={
                                <TextInput.Icon
                                    icon={secureTextEntry ? 'eye-off' : 'eye'}
                                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                                />
                            }
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

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
                            style={[styles.socialButton, styles.googleButton]}
                            onPress={() => promptAsync()}
                            disabled={!request || loading}
                        >
                            <MaterialCommunityIcons name="google" size={22} color="#DB4437" />
                            <Text style={styles.socialButtonText}>Continue with Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, styles.phoneButton]}
                            onPress={() => navigation.navigate('PhoneLogin')}
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
    input: {
        marginBottom: 12,
        backgroundColor: Colors.surface,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
