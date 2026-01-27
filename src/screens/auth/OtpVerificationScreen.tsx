import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

const OtpVerificationScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { email } = route.params || { email: 'user@example.com' };

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

    const handleVerify = () => {
        // TODO: Implement OTP verification
        console.log('Verifying OTP:', otp);
        // On success -> Navigate to Main App
        // navigation.reset(...)
    };

    const handleResend = () => {
        setTimer(56);
        setCanResend(false);
        console.log('Resending OTP');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Enter Verification Code</Text>
                <Text style={styles.subtitle}>
                    We have sent the verification code to {email}
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

                <View style={styles.resendContainer}>
                    {canResend ? (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Resend Code</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.timerText}>Resend code in {timer}s</Text>
                    )}
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
    resendContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    timerText: {
        color: '#888',
    },
    note: {
        marginTop: 40,
        textAlign: 'center',
        fontSize: 12,
        color: '#999'
    }
});

export default OtpVerificationScreen;
