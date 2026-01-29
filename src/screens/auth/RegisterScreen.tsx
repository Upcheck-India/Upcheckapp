import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppInput } from '../../components/AppInput';
import { GradientButton } from '../../components/GradientButton';
import { Colors } from '../../constants/Colors';
import { AuthService } from '../../services/auth';

const RegisterScreen = () => {
    const navigation = useNavigation<any>();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string) => {
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        return !phone || phoneRegex.test(phone);
    };

    const handleRegister = async () => {
        if (!fullName.trim()) {
            Alert.alert('Validation', 'Full name is required');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Validation', 'Email is required');
            return;
        }
        if (!validateEmail(email)) {
            Alert.alert('Validation', 'Please enter a valid email address');
            return;
        }
        if (phone && !validatePhone(phone)) {
            Alert.alert('Validation', 'Please enter a valid phone number');
            return;
        }
        if (!password) {
            Alert.alert('Validation', 'Password is required');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Validation', 'Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Validation', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const result = await AuthService.register({
                email,
                password,
                fullName,
                phone: phone || undefined,
            });

            if (result.user) {
                try {
                    await AuthService.sendOtp({ email });
                    navigation.navigate('OtpVerification', {
                        email,
                        phone,
                        mode: 'register',
                        userId: result.user.id,
                    });
                } catch (otpError: any) {
                    Alert.alert(
                        'Account Created',
                        'Your account was created but we could not send the verification code. Please try logging in.',
                        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                    );
                }
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginNavigate = () => {
        navigation.navigate('Login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Gradient Header */}
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Join the Upcheck community</Text>
                </LinearGradient>

                <View style={styles.content}>
                    <View style={styles.form}>
                        <AppInput
                            label="Full Name *"
                            value={fullName}
                            onChangeText={setFullName}
                            left={<TextInput.Icon icon="account" />}
                        />

                        <AppInput
                            label="Email Address *"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            left={<TextInput.Icon icon="email" />}
                        />

                        <AppInput
                            label="Phone Number (optional)"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            left={<TextInput.Icon icon="phone" />}
                        />

                        <AppInput
                            label="Password *"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secureTextEntry}
                            left={<TextInput.Icon icon="lock" />}
                            right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                        />
                        <Text style={styles.hint}>Minimum 6 characters</Text>

                        <AppInput
                            label="Confirm Password *"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={secureTextEntry}
                            left={<TextInput.Icon icon="lock-check" />}
                        />
                    </View>

                    <GradientButton
                        title="Sign Up"
                        onPress={handleRegister}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={handleLoginNavigate}>
                            <Text style={styles.loginLink}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
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
        paddingVertical: 40,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    title: {
        fontWeight: 'bold',
        color: Colors.textLight,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
    },
    content: {
        padding: 24,
    },
    form: {
        marginBottom: 24,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: -8,
        marginBottom: 12,
        marginLeft: 4,
    },
    button: {
        marginBottom: 24,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: Colors.textSecondary,
    },
    loginLink: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
});

export default RegisterScreen;
