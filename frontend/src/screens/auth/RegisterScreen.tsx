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
import { Image } from 'react-native';

const RegisterScreen = () => {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleGetStarted = async () => {
        if (!email.trim()) {
            Alert.alert('Validation', 'Email is required');
            return;
        }
        if (!validateEmail(email)) {
            Alert.alert('Validation', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await AuthService.sendOtp({ email });
            navigation.navigate('OtpVerification', { email, mode: 'register' });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginNavigate = () => {
        navigation.navigate('Login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                    <Text variant="titleLarge" style={styles.title}>Get Started</Text>
                    <Text style={styles.subtitle}>
                        Enter your email to create an account or sign in.{'\n'}
                        We'll send you a verification code.
                    </Text>

                    <View style={styles.form}>
                        <AppInput
                            label="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            left={<TextInput.Icon icon="email" />}
                        />
                    </View>

                    <GradientButton
                        title="Get Started"
                        onPress={handleGetStarted}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={handleLoginNavigate}>
                            <Text style={styles.loginLink}>Login with OTP</Text>
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
        alignItems: 'center',
        paddingVertical: 48,
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
        textAlign: 'center',
        color: Colors.text,
        fontWeight: '600',
        marginBottom: 8,
    },
    subtitle: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginBottom: 32,
        lineHeight: 22,
    },
    form: {
        marginBottom: 24,
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
