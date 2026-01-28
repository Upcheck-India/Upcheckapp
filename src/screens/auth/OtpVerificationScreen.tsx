import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthService } from '../../services/auth';

const OtpVerificationScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { email, phone } = route.params || { email: 'user@example.com' };

    const [otp, setOtp] = useState('');
    const [timer, setTimer] = useState(56);
    const [canResend, setCanResend] = useState(false);

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
        try {
            const result = await AuthService.verifyOtp({ email, phone, token: otp });
            if (result.verified) {
                alert('OTP verified!');
                navigation.replace('Main');
            } else {
                alert('Invalid OTP');
            }
        } catch (error) {
            alert('Verification failed');
        }
    };

    const handleResend = async () => {
        try {
            await AuthService.sendOtp({ email: email || undefined, phone: phone || undefined });
            alert('OTP resent!');
            setTimer(56);
            setCanResend(false);
        } catch (error) {
            alert('Failed to resend OTP');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Enter Verification Code</Text>
                <Text style={styles.subtitle}>
                    We have sent the verification code to {email || phone}
                </Text>

                <TextInput
                    label="Verification Code"
                    value={otp}
                    onChangeText={(text) => {
                        setOtp(text);
                        if (text.length === 6) { // Auto submit example
                            // handleVerify();
                        }
                    }}
                    mode="outlined"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.input}
                    left={<TextInput.Icon icon="message-processing" />}
                />

                <Button mode="contained" onPress={handleVerify} style={styles.button}>
                    Verify
                </Button>

                {canResend ? (
                    <Button mode="outlined" onPress={handleResend} style={styles.button}>
                        Resend OTP
                    </Button>
                ) : (
                    <Text style={styles.resendText}>
                        Resend OTP in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </Text>
                )}

                <View style={styles.note}>
                    <Text variant="bodySmall">Enter the 6-digit code sent to {email || phone}</Text>
                </View>

                <Text style={styles.note}>
                    Note: Please check your phone notifications if you didn't receive the email.
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        color: '#666',
    },
    input: {
        marginBottom: 24,
        textAlign: 'center'
    },
    button: {
        paddingVertical: 6,
    },
    resendText: {
        marginTop: 12,
        textAlign: 'center',
        color: '#666',
    },
    note: {
        marginTop: 16,
        alignItems: 'center',
    },
});

export default OtpVerificationScreen;
