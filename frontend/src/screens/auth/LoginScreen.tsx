import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export const LoginScreen = () => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation<any>();
    const { login, signInWithGoogle } = useAuth();
    const theme = useTheme();

    const handleLogin = async () => {
        if (!emailOrPhone || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await login({ emailOrPhone, password });
            if (response?.requires2fa) {
                navigation.navigate('TwoFALogin', { tempToken: response.tempToken });
                return;
            }
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.headerContainer}>
                    <Text variant="headlineLarge" style={styles.title}>Welcome Back</Text>
                    <Text variant="bodyLarge" style={styles.subtitle}>Sign in to continue to Upcheck</Text>
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        label="Email or Phone"
                        value={emailOrPhone}
                        onChangeText={setEmailOrPhone}
                        mode="outlined"
                        autoCapitalize="none"
                        style={styles.input}
                        error={!!error}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        secureTextEntry
                        style={styles.input}
                        error={!!error}
                    />

                    <TouchableOpacity
                        onPress={() => navigation.navigate('ForgotPassword')}
                        style={styles.forgotPassword}
                    >
                        <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Login
                    </Button>

                    <View style={styles.orContainer}>
                        <View style={styles.divider} />
                        <Text variant="bodyMedium" style={styles.orText}>OR</Text>
                        <View style={styles.divider} />
                    </View>

                    <Button
                        mode="outlined"
                        onPress={signInWithGoogle}
                        style={styles.googleButton}
                        icon="google"
                    >
                        Sign in with Google
                    </Button>

                    <View style={styles.footer}>
                        <Text variant="bodyMedium">Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                Sign Up
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardView: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    headerContainer: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        color: '#666',
    },
    formContainer: {
        width: '100%',
    },
    input: {
        marginBottom: 16,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    button: {
        borderRadius: 8,
        marginBottom: 24,
    },
    buttonContent: {
        paddingVertical: 6,
    },
    errorText: {
        color: 'red',
        marginBottom: 16,
        textAlign: 'center',
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    orText: {
        marginHorizontal: 16,
        color: '#666',
    },
    googleButton: {
        borderRadius: 8,
        marginBottom: 24,
        borderColor: '#ddd',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
});
