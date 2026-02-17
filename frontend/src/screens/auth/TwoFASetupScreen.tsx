import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text, TextInput, Surface, ActivityIndicator, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { GradientButton } from '../../components/GradientButton';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Step = 'setup' | 'backup-codes';

const TwoFASetupScreen = ({ navigation }: any) => {
    const [step, setStep] = useState<Step>('setup');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [secret, setSecret] = useState<string>('');
    const [otpAuthUrl, setOtpAuthUrl] = useState<string>('');
    const [code, setCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    useEffect(() => {
        fetchSetup();
    }, []);

    const fetchSetup = async () => {
        try {
            const response = await api.post('/auth/2fa/setup');
            setSecret(response.data.secret);
            setOtpAuthUrl(response.data.otpAuthUrl);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to initialize 2FA setup');
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
            const response = await api.post('/auth/2fa/enable', { token: code });
            const data = response.data;
            if (data.backupCodes) {
                setBackupCodes(data.backupCodes);
                setStep('backup-codes');
            } else {
                Alert.alert('Success', 'Two-Factor Authentication has been enabled');
                navigation.goBack();
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to enable 2FA');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopySecret = async () => {
        await Clipboard.setStringAsync(secret);
        Alert.alert('Copied', 'Secret key copied to clipboard');
    };

    const handleCopyBackupCodes = async () => {
        await Clipboard.setStringAsync(backupCodes.join('\n'));
        Alert.alert('Copied', 'Backup codes copied to clipboard');
    };

    const handleDone = () => {
        Alert.alert(
            'Have you saved your backup codes?',
            'You will not be able to see these codes again. Make sure you have saved them in a secure location.',
            [
                { text: 'Go Back', style: 'cancel' },
                { text: 'Yes, I saved them', onPress: () => navigation.goBack() },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // ─── Backup Codes Screen ─────────────────────────────────
    if (step === 'backup-codes') {
        return (
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.content}>
                    <MaterialCommunityIcons
                        name="shield-check"
                        size={64}
                        color={Colors.success}
                        style={styles.successIcon}
                    />
                    <Text variant="headlineMedium" style={styles.title}>2FA Enabled!</Text>
                    <Text style={styles.instruction}>
                        Save these backup codes in a secure location. Each code can only be used once if you lose access to your authenticator app.
                    </Text>

                    <Surface style={styles.codesContainer} elevation={2}>
                        <View style={styles.codesGrid}>
                            {backupCodes.map((code, index) => (
                                <View key={index} style={styles.codeItem}>
                                    <Text style={styles.codeNumber}>{index + 1}.</Text>
                                    <Text style={styles.codeText} selectable>{code}</Text>
                                </View>
                            ))}
                        </View>
                        <IconButton
                            icon="content-copy"
                            onPress={handleCopyBackupCodes}
                            iconColor={Colors.primary}
                            style={styles.copyButton}
                        />
                    </Surface>

                    <View style={styles.warningBox}>
                        <MaterialCommunityIcons name="alert" size={20} color={Colors.warning} />
                        <Text style={styles.warningText}>
                            These codes will NOT be shown again. Store them safely.
                        </Text>
                    </View>

                    <GradientButton
                        title="I've Saved My Codes"
                        onPress={handleDone}
                        style={styles.button}
                        icon="check-circle"
                    />
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ─── Setup Screen ────────────────────────────────────────
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
                    <Text style={styles.secretLabel}>Manual Entry:</Text>
                    <Text style={styles.secretText} selectable>{secret}</Text>
                    <IconButton icon="content-copy" onPress={handleCopySecret} size={18} />
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
    successIcon: {
        alignSelf: 'center',
        marginBottom: 8,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
        color: Colors.text,
    },
    instruction: {
        fontSize: 15,
        marginBottom: 16,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    qrContainer: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        alignSelf: 'center',
        marginBottom: 24,
    },
    secretContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        backgroundColor: Colors.surface,
        padding: 12,
        borderRadius: 8,
    },
    secretLabel: {
        fontWeight: 'bold',
        marginRight: 8,
        fontSize: 13,
    },
    secretText: {
        fontFamily: 'monospace',
        fontSize: 13,
        flex: 1,
    },
    input: {
        marginBottom: 24,
        backgroundColor: Colors.surface,
    },
    button: {
        marginTop: 8,
    },
    codesContainer: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        marginBottom: 16,
    },
    codesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    codeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        paddingVertical: 6,
    },
    codeNumber: {
        color: Colors.textSecondary,
        fontSize: 13,
        width: 24,
    },
    codeText: {
        fontFamily: 'monospace',
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        letterSpacing: 1,
    },
    copyButton: {
        alignSelf: 'center',
        marginTop: 4,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warningLight,
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    warningText: {
        color: '#E65100',
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
        lineHeight: 18,
    },
});

export default TwoFASetupScreen;
