import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, ActivityIndicator, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { AuthService } from '../../services/auth';
import { GradientButton } from '../../components/GradientButton';
import { useAuthStore } from '../../store/authStore';
import QRCode from 'react-native-qrcode-svg';

const TwoFASetupScreen = ({ navigation }: any) => {
    const { accessToken } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [secret, setSecret] = useState<string>('');
    const [otpAuthUrl, setOtpAuthUrl] = useState<string>('');
    const [code, setCode] = useState('');

    useEffect(() => {
        fetchSetup();
    }, []);

    const fetchSetup = async () => {
        try {
            const data = await AuthService.setup2FA(accessToken!);
            setSecret(data.secret);
            setOtpAuthUrl(data.otpAuthUrl);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to initialize 2FA setup');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleEnable = async () => {
        if (!code || code.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter a valid 6-digit code');
            return;
        }

        setSubmitting(true);
        try {
            await AuthService.enable2FA(accessToken!, code);
            Alert.alert('Success', 'Two-Factor Authentication has been enabled');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to enable 2FA');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopySecret = () => {
        // Implement copy to clipboard if needed
        Alert.alert('Secret', secret);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>Enable 2FA</Text>

                <Text style={styles.instruction}>
                    1. Scan the QR code below with your authenticator app (e.g., Google Authenticator, Authy).
                </Text>

                <Surface style={styles.qrContainer} elevation={2}>
                    {otpAuthUrl ? (
                        <QRCode value={otpAuthUrl} size={200} />
                    ) : (
                        <ActivityIndicator />
                    )}
                </Surface>

                <View style={styles.secretContainer}>
                    <Text style={styles.secretLabel}>Manual Entry Secret:</Text>
                    <Text style={styles.secretText} selectable>{secret}</Text>
                    <IconButton icon="content-copy" onPress={handleCopySecret} />
                </View>

                <Text style={styles.instruction}>
                    2. Enter the 6-digit code from your app to verify and enable 2FA.
                </Text>

                <TextInput
                    label="Authentication Code"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Icon icon="shield-check" />}
                />

                <GradientButton
                    title="Verify & Enable"
                    onPress={handleEnable}
                    loading={submitting}
                    disabled={submitting}
                    style={styles.button}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
        color: Colors.text,
    },
    instruction: {
        fontSize: 16,
        marginBottom: 16,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    qrContainer: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        alignSelf: 'center',
        marginBottom: 24,
    },
    secretContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        backgroundColor: Colors.surface,
        padding: 12,
        borderRadius: 8,
    },
    secretLabel: {
        fontWeight: 'bold',
        marginRight: 8,
    },
    secretText: {
        fontFamily: 'monospace',
    },
    input: {
        marginBottom: 24,
        backgroundColor: Colors.surface,
    },
    button: {
        marginTop: 8,
    },
});

export default TwoFASetupScreen;
