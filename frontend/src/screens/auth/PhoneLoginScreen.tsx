import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AuthService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Step = 'phone' | 'otp';

const PhoneLoginScreen = ({ navigation }: any) => {
    const [step, setStep] = useState<Step>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { phoneLogin } = useAuthStore();

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startCountdown = () => {
        setCountdown(60);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async () => {
        if (!phoneNumber.trim()) {
            Alert.alert('Error', 'Please enter your phone number');
            return;
        }

        // Basic phone validation
        const cleaned = phoneNumber.trim();
        if (cleaned.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number with country code (e.g., +91XXXXXXXXXX)');
            return;
        }

        setSendingOtp(true);
        try {
            await AuthService.sendOtp(cleaned);
            setStep('otp');
            startCountdown();
            Alert.alert('OTP Sent', `A verification code has been sent to ${cleaned}`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send OTP');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResendOtp = async () => {
        if (countdown > 0) return;
        setSendingOtp(true);
        try {
            await AuthService.sendOtp(phoneNumber.trim());
            startCountdown();
            Alert.alert('OTP Resent', 'A new verification code has been sent');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resend OTP');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOtp = async (code?: string) => {
        const otpCode = code || otp;
        if (!otpCode || otpCode.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit verification code');
            return;
        }

        setVerifying(true);
        try {
            const data = await phoneLogin(phoneNumber.trim(), otpCode);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (data?.requires2fa) {
                navigation.navigate('TwoFALogin', { tempToken: data.temp_token });
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Verification Failed', error.message || 'Invalid OTP');
        } finally {
            setVerifying(false);
        }
    };

    const handleOtpChange = (text: string) => {
        setOtp(text);
        if (text.length === 6) {
            handleVerifyOtp(text);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <MaterialCommunityIcons name="cellphone-message" size={48} color={Colors.textLight} />
                    <Text variant="headlineMedium" style={styles.headerTitle}>Phone Login</Text>
                    <Text variant="bodyMedium" style={styles.headerSubtitle}>
                        {step === 'phone'
                            ? 'Enter your phone number to receive a verification code'
                            : `Enter the code sent to ${phoneNumber}`
                        }
                    </Text>
                </LinearGradient>

                <View style={styles.content}>
                    {step === 'phone' ? (
                        <>
                            <TextInput
                                label="Phone Number"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                                mode="outlined"
                                style={styles.input}
                                placeholder="+91XXXXXXXXXX"
                                left={<TextInput.Icon icon="phone" />}
                                outlineColor={Colors.border}
                                activeOutlineColor={Colors.primary}
                            />

                            <Text style={styles.hint}>
                                Include your country code (e.g., +91 for India, +1 for US)
                            </Text>

                            <GradientButton
                                title="Send Verification Code"
                                onPress={handleSendOtp}
                                loading={sendingOtp}
                                disabled={sendingOtp}
                                icon="message-text"
                                style={styles.button}
                            />
                        </>
                    ) : (
                        <>
                            <TextInput
                                label="Verification Code"
                                value={otp}
                                onChangeText={handleOtpChange}
                                keyboardType="number-pad"
                                maxLength={6}
                                mode="outlined"
                                style={styles.input}
                                left={<TextInput.Icon icon="shield-check" />}
                                outlineColor={Colors.border}
                                activeOutlineColor={Colors.primary}
                            />

                            <GradientButton
                                title="Verify & Sign In"
                                onPress={handleVerifyOtp}
                                loading={verifying}
                                disabled={verifying}
                                icon="check-circle"
                                style={styles.button}
                            />

                            <TouchableOpacity
                                onPress={handleResendOtp}
                                disabled={countdown > 0 || sendingOtp}
                                style={styles.resendRow}
                            >
                                <Text style={[
                                    styles.resendText,
                                    countdown > 0 && { color: Colors.grey }
                                ]}>
                                    {countdown > 0
                                        ? `Resend code in ${countdown}s`
                                        : 'Resend verification code'
                                    }
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setStep('phone'); setOtp(''); }}
                                style={styles.changeRow}
                            >
                                <Text style={styles.changeText}>Change phone number</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backRow}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.primary} />
                        <Text style={styles.backText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
        paddingHorizontal: 24,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: Colors.textLight,
        marginTop: 12,
        marginBottom: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 32,
    },
    input: {
        marginBottom: 16,
        backgroundColor: Colors.surface,
    },
    hint: {
        color: Colors.textSecondary,
        fontSize: 13,
        marginBottom: 24,
        marginTop: -8,
    },
    button: {
        marginBottom: 16,
    },
    resendRow: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    resendText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    changeRow: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    changeText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
    },
    backText: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 6,
    },
});

export default PhoneLoginScreen;
