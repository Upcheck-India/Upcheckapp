import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
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
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async () => {
        if (!email.trim()) {
            Alert.alert('Validation', 'Email is required');
            return;
        }

        setLoading(true);
        try {
            await AuthService.sendOtp({ email });
            navigation.navigate('OtpVerification', { email, mode: 'login' });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
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
                <Text variant="headlineMedium" style={styles.headerTitle}>Welcome Back</Text>
                <Text variant="bodyMedium" style={styles.headerSubtitle}>Login to your account</Text>
            </LinearGradient>

            <View style={styles.content}>
                <Text style={styles.subtitle}>
                    Enter your email and we'll send you a{'\n'}one-time verification code.
                </Text>

                <View style={styles.inputContainer}>
                    <AppInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        left={<TextInput.Icon icon="email" />}
                    />
                </View>

                <GradientButton
                    title="Send OTP"
                    onPress={handleSendOtp}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
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
    headerTitle: {
        fontWeight: 'bold',
        color: Colors.textLight,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    subtitle: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginBottom: 32,
        lineHeight: 22,
    },
    inputContainer: {
        marginBottom: 16,
    },
    button: {
        marginTop: 16,
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
