import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { AuthService } from '../../services/auth';

const ResetPasswordScreen = ({ route, navigation }: any) => {
    // Expecting token and refreshToken specific args from deep link
    // or manually entered if we provide that option
    const [token, setToken] = useState(route.params?.token || '');
    const [refreshToken, setRefreshToken] = useState(route.params?.refreshToken || '');

    // Handle deep link hash parsing if params are missing (common with Supabase implicit flow)
    React.useEffect(() => {
        const handleDeepLink = async () => {
            // If we already have params via navigation linking, great.
            if (token && refreshToken) return;

            const url = await Linking.getInitialURL();
            if (url) {
                // Manual parsing to be safe for hash fragments
                if (url.includes('#')) {
                    const hash = url.split('#')[1];
                    // Simple parsing without URLSearchParams polyfill reliance
                    const params = hash.split('&').reduce((acc: any, part) => {
                        const [key, value] = part.split('=');
                        acc[decodeURIComponent(key)] = decodeURIComponent(value);
                        return acc;
                    }, {});

                    if (params.access_token) setToken(params.access_token);
                    if (params.refresh_token) setRefreshToken(params.refresh_token);
                }

                // Also check query params if expo-linking parsed them differently
                const { queryParams } = Linking.parse(url);
                if (queryParams?.token && !token) setToken(queryParams.token as string);
                if (queryParams?.refreshToken && !refreshToken) setRefreshToken(queryParams.refreshToken as string);
            }
        };
        handleDeepLink();
    }, []);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    const handleReset = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match or are empty');
            return;
        }
        if (!token || !refreshToken) {
            Alert.alert('Error', 'Invalid reset link parameters');
            return;
        }

        setLoading(true);
        try {
            await AuthService.resetPassword(token, refreshToken, newPassword);
            Alert.alert('Success', 'Password has been reset. Please login with your new password.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>Reset Password</Text>

                <TextInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={secureTextEntry}
                    mode="outlined"
                    style={styles.input}
                    right={<TextInput.Icon icon="eye" onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                />

                <TextInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={secureTextEntry}
                    mode="outlined"
                    style={styles.input}
                />

                <GradientButton
                    title="Set New Password"
                    onPress={handleReset}
                    loading={loading}
                    disabled={loading}
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
    content: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
        color: Colors.text,
    },
    input: {
        marginBottom: 16,
        backgroundColor: Colors.surface,
    },
    button: {
        marginTop: 16,
    },
});

export default ResetPasswordScreen;
