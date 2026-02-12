import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { useAuthStore } from '../../store/authStore';

const TwoFALoginScreen = ({ route, navigation }: any) => {
    const { tempToken } = route.params; // Passed from LoginScreen
    const { loginWith2FA } = useAuthStore();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!code || code.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await loginWith2FA(tempToken, code);
            // On success, store updates isAuthenticated, RootNavigator redirects to Main
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>Two-Factor Authentication</Text>
                <Text style={styles.subtitle}>Enter the code from your authenticator app</Text>

                <TextInput
                    label="6-Digit Code"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Icon icon="shield-check" />}
                />

                <GradientButton
                    title="Verify"
                    onPress={handleVerify}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                />
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
    },
    input: {
        marginBottom: 24,
        backgroundColor: Colors.surface,
    },
    button: {
        marginTop: 8,
    },
});

export default TwoFALoginScreen;
