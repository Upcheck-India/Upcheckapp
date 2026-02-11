import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, TextInput, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppInput } from '../../components/AppInput';
import { GradientButton } from '../../components/GradientButton';
import { Colors } from '../../constants/Colors';
import { AuthService } from '../../services/auth';

const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);

    const handleLogin = async () => {
        if (!email) {
            Alert.alert('Validation', 'Email is required');
            return;
        }
        if (!password) {
            Alert.alert('Validation', 'Password is required');
            return;
        }

        setLoading(true);
        try {
            const result = await AuthService.login({ email, password });
            if (result.user) {
                navigation.replace('Main');
            }
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginWithOtp = async () => {
        if (!email && !phone) {
            Alert.alert('Validation', 'Email or phone number is required');
            return;
        }

        setOtpLoading(true);
        try {
            await AuthService.sendOtp({ email: email || undefined, phone: phone || undefined });
            navigation.navigate('OtpVerification', { email, phone, mode: 'login' });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Validation', 'Please enter your email address first');
            return;
        }
        handleLoginWithOtp();
    };

    const handleRegisterNavigate = () => {
        navigation.navigate('Register');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Gradient Header */}
            <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Image
                    source={require('../../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text variant="headlineLarge" style={styles.logoText}>UPCHECK</Text>
                <Text variant="bodyMedium" style={styles.tagline}>Smart Shrimp Farming</Text>
            </LinearGradient>

            <View style={styles.content}>
                <Text variant="titleLarge" style={styles.title}>Welcome Back</Text>

                <View style={styles.inputContainer}>
                    <AppInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        left={<TextInput.Icon icon="email" />}
                    />

                    <AppInput
                        label="Phone Number (for OTP login)"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        left={<TextInput.Icon icon="phone" />}
                    />

                    <AppInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={secureTextEntry}
                        left={<TextInput.Icon icon="lock" />}
                        right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                    />

                    <TouchableOpacity onPress={handleForgotPassword}>
                        <Text style={styles.forgotPassword}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <GradientButton
                    title="Login"
                    onPress={handleLogin}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                />

                <View style={styles.dividerContainer}>
                    <Divider style={styles.divider} />
                    <Text style={styles.orText}>OR</Text>
                    <Divider style={styles.divider} />
                </View>

                <TouchableOpacity
                    style={styles.otpButton}
                    onPress={handleLoginWithOtp}
                    disabled={otpLoading}
                >
                    {otpLoading ? (
                        <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                        <Text style={styles.otpButtonText}>Login with OTP</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an Account? </Text>
                    <TouchableOpacity onPress={handleRegisterNavigate}>
                        <Text style={styles.registerLink}>Register</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    logo: {
        width: 80,
        height: 80,
    },
    logoText: {
        fontWeight: 'bold',
        color: Colors.textLight,
        marginTop: 12,
    },
    tagline: {
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        marginBottom: 24,
        textAlign: 'center',
        color: Colors.text,
        fontWeight: '600',
    },
    inputContainer: {
        marginBottom: 16,
    },
    forgotPassword: {
        textAlign: 'right',
        marginTop: 8,
        color: Colors.primary,
        fontWeight: '500',
    },
    button: {
        marginTop: 16,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        backgroundColor: Colors.border,
    },
    orText: {
        marginHorizontal: 16,
        color: Colors.grey,
        fontWeight: '500',
    },
    otpButton: {
        borderWidth: 2,
        borderColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    otpButtonText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: Colors.textSecondary,
    },
    registerLink: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});

export default LoginScreen;
