import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../../services/apiClient';

export const RegisterScreen = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navigation = useNavigation<any>();
    const { register, signInWithGoogle } = useAuth();
    const theme = useTheme();

    useEffect(() => {
        if (!username || username.length < 3) { setUsernameStatus('idle'); return; }
        setUsernameStatus('checking');
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const result = await apiClient.get(`/profiles/check-username/${username.trim().toLowerCase()}`) as any;
                setUsernameStatus(result?.available ? 'available' : 'taken');
            } catch {
                setUsernameStatus('idle');
            }
        }, 500);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [username]);

    const handleGoogleSignUp = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google sign-up failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const validatePassword = (pwd: string) => {
        // Basic validation, backend does detailed validation
        return pwd.length >= 8;
    };

    const handleRegister = async () => {
        if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (usernameStatus === 'taken') {
            setError('That username is already taken. Please choose another.');
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
            const result = await register({ firstName, lastName, username, email, password });
            if (result?.requiresEmailConfirmation) {
                setSuccessMessage(`Account created! Check ${result.email} for a verification link before logging in.`);
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
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
                            label="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                            mode="outlined"
                            style={styles.input}
                            error={!!error}
                        />

                        <TextInput
                            label="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                            mode="outlined"
                            style={styles.input}
                            error={!!error}
                        />

                        <TextInput
                            label="Username"
                            value={username}
                            onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            mode="outlined"
                            autoCapitalize="none"
                            style={styles.input}
                            error={usernameStatus === 'taken'}
                            right={
                                usernameStatus === 'checking' ? <TextInput.Icon icon="loading" /> :
                                usernameStatus === 'available' ? <TextInput.Icon icon="check-circle" color="green" /> :
                                usernameStatus === 'taken' ? <TextInput.Icon icon="close-circle" color="red" /> : undefined
                            }
                        />
                        {usernameStatus === 'available' && (
                            <HelperText type="info" visible style={{ color: 'green', marginTop: -8, marginBottom: 4 }}>Username is available</HelperText>
                        )}
                        {usernameStatus === 'taken' && (
                            <HelperText type="error" visible style={{ marginTop: -8, marginBottom: 4 }}>Username is already taken</HelperText>
                        )}

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

                        {successMessage ? (
                            <Text style={styles.successText}>{successMessage}</Text>
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
                            onPress={handleGoogleSignUp}
                            loading={googleLoading}
                            disabled={loading || googleLoading}
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
    successText: {
        color: '#2e7d32',
        backgroundColor: '#e8f5e9',
        borderRadius: 6,
        padding: 12,
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
