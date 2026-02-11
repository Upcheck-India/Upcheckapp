import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthService } from '../../services/auth';
import { Colors } from '../../constants/Colors';

const OtpVerificationScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { email, mode = 'login' } = route.params || {};

    const [otp, setOtp] = useState('');
    const [timer, setTimer] = useState(56);
    const [canResend, setCanResend] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleVerify = async () => {
        if (!otp) {
            Alert.alert('Validation', 'Please enter the verification code');
            return;
        }
        if (otp.length !== 6) {
            Alert.alert('Validation', 'Please enter a valid 6-digit code');
            return;
        }

        setVerifying(true);
        try {
            // loginWithOtp verifies the OTP and returns session tokens
            const result = await AuthService.loginWithOtp({
                email: email || undefined,
                token: otp,
            });

            if (result.user) {
                // Session is automatically set in Supabase by loginWithOtp
                // AuthContext will pick up the state change and navigate
                navigation.replace('Main');
            } else {
                Alert.alert('Error', 'Verification succeeded but session creation failed. Please try again.');
            }
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message || 'Failed to verify code. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await AuthService.sendOtp({ email: email || undefined });
            Alert.alert('Success', 'A new verification code has been sent.');
            setTimer(56);
            setCanResend(false);
            setOtp('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resend code. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const displayTarget = email || 'your email';
    const headerText = mode === 'register' ? 'Verify Your Email' : 'Enter Verification Code';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>{headerText}</Text>
                <Text style={styles.subtitle}>
                    We have sent a 6-digit verification code to{'\n'}
                    <Text style={styles.targetText}>{displayTarget}</Text>
                </Text>

                <TextInput
                    label="Verification Code"
                    value={otp}
                    onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9]/g, '');
                        setOtp(numericText);
                    }}
                    mode="outlined"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.input}
                    left={<TextInput.Icon icon="message-processing" />}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                />

                <Button
                    mode="contained"
                    onPress={handleVerify}
                    style={styles.button}
                    buttonColor={Colors.primary}
                    disabled={verifying || otp.length !== 6}
                >
                    {verifying ? <ActivityIndicator color="white" size="small" /> : 'Verify & Continue'}
                </Button>

                {canResend ? (
                    <Button
                        mode="outlined"
                        onPress={handleResend}
                        style={styles.button}
                        textColor={Colors.primary}
                        disabled={resending}
                    >
                        {resending ? <ActivityIndicator color={Colors.primary} size="small" /> : 'Resend Code'}
                    </Button>
                ) : (
                    <Text style={styles.resendText}>
                        Resend code in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </Text>
                )}

                <View style={styles.note}>
                    <Text variant="bodySmall" style={styles.noteText}>
                        Didn't receive the code? Check your spam folder or try resending.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: Colors.primary }}>← Go Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    content: {
        padding: 24,
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    targetText: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    input: {
        marginBottom: 24,
        textAlign: 'center',
        fontSize: 18,
        letterSpacing: 8,
    },
    button: {
        paddingVertical: 6,
        marginTop: 8,
    },
    resendText: {
        marginTop: 16,
        textAlign: 'center',
        color: Colors.textSecondary,
    },
    note: {
        marginTop: 24,
        alignItems: 'center',
    },
    noteText: {
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    backLink: {
        marginTop: 32,
        alignItems: 'center',
    },
});

export default OtpVerificationScreen;
