import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Mode = 'totp' | 'backup';

const TwoFALoginScreen = ({ route }: any) => {
    const { tempToken } = route.params;
    const { loginWith2FA } = useAuth();
    const [mode, setMode] = useState<Mode>('totp');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async (overrideCode?: string) => {
        const trimmed = (overrideCode || code).trim();
        if (mode === 'totp' && (!trimmed || trimmed.length !== 6)) {
            Alert.alert('Invalid Code', 'Please enter a valid 6-digit code');
            return;
        }
        if (mode === 'backup' && (!trimmed || trimmed.length < 6)) {
            Alert.alert('Invalid Code', 'Please enter a valid backup code (e.g., ABCD-EF12)');
            return;
        }

        setLoading(true);
        try {
            await loginWith2FA(tempToken, trimmed);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Verification Failed', error.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (text: string) => {
        setCode(text);
        if (mode === 'totp' && text.length === 6) {
            handleVerify(text);
        }
    };

    const toggleMode = () => {
        setCode('');
        setMode(mode === 'totp' ? 'backup' : 'totp');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <MaterialCommunityIcons
                    name={mode === 'totp' ? 'shield-lock' : 'key-variant'}
                    size={56}
                    color={Colors.primary}
                    style={styles.icon}
                />

                <Text variant="headlineMedium" style={styles.title}>
                    Two-Factor Authentication
                </Text>
                <Text style={styles.subtitle}>
                    {mode === 'totp'
                        ? 'Enter the 6-digit code from your authenticator app'
                        : 'Enter one of your backup codes'
                    }
                </Text>

                <TextInput
                    label={mode === 'totp' ? '6-Digit Code' : 'Backup Code'}
                    value={code}
                    onChangeText={handleCodeChange}
                    keyboardType={mode === 'totp' ? 'number-pad' : 'default'}
                    maxLength={mode === 'totp' ? 6 : 9}
                    autoCapitalize={mode === 'backup' ? 'characters' : 'none'}
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Icon icon={mode === 'totp' ? 'shield-check' : 'key'} />}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                />

                <GradientButton
                    title="Verify"
                    onPress={handleVerify}
                    loading={loading}
                    disabled={loading}
                    icon="check-circle"
                    style={styles.button}
                />

                <TouchableOpacity onPress={toggleMode} style={styles.toggleRow}>
                    <Text style={styles.toggleText}>
                        {mode === 'totp'
                            ? 'Use a backup code instead'
                            : 'Use authenticator app instead'
                        }
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    icon: {
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: Colors.text,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    input: {
        marginBottom: 24,
        backgroundColor: Colors.surface,
    },
    button: {
        marginTop: 8,
    },
    toggleRow: {
        alignItems: 'center',
        marginTop: 24,
        paddingVertical: 8,
    },
    toggleText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default TwoFALoginScreen;
