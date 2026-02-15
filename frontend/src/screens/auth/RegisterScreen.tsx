import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export const RegisterScreen = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation<any>();
    const { register, signInWithGoogle } = useAuth();
    const theme = useTheme();

    const validatePassword = (pwd: string) => {
        // Basic validation, backend does detailed validation
        return pwd.length >= 8;
    };

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!validatePassword(password)) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await register({ name, email, password });
            // Navigation is handled by AuthContext state change usually, 
            // but if email verification is required, we might show a message or navigate to a verification screen.
            // For now, let's assume auto-login or state update handles it.
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.headerContainer}>
                        <Text variant="headlineLarge" style={styles.title}>Create Account</Text>
                        <Text variant="bodyLarge" style={styles.subtitle}>Sign up to get started with Upcheck</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <TextInput
                            label="Full Name"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={styles.input}
                            error={!!error}
                        />

                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            mode="outlined"
                            keyboardType="email-address"
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
                        <HelperText type="info" visible={true}>
                            At least 8 characters, uppercase, lowercase, number, special char.
                        </HelperText>

                        <TextInput
                            label="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            mode="outlined"
                            secureTextEntry
                            style={styles.input}
                            error={!!error}
                        />

                        {error ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : null}

                        <Button
                            mode="contained"
                            onPress={handleRegister}
                            loading={loading}
                            disabled={loading}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                        >
                            Sign Up
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
                            Sign up with Google
                        </Button>

                        <View style={styles.footer}>
                            <Text variant="bodyMedium">Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                    Log In
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
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
    },
    scrollContent: {
        padding: 20,
        flexGrow: 1,
        justifyContent: 'center',
    },
    headerContainer: {
        marginBottom: 30,
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
        marginBottom: 12,
    },
    button: {
        borderRadius: 8,
        marginTop: 12,
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
        marginBottom: 20,
    },
});
