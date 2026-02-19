import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation<any>();
    const theme = useTheme();
    const { forgotPassword } = useAuth();

    const handleReset = async () => {
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await forgotPassword(email);
            setSuccess('Check your inbox — we sent a password reset link to ' + email.trim().toLowerCase() + '.');
        } catch (err: any) {
            setError(err.message || 'Request failed. Please try again.');
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
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: theme.colors.primary }}>Back to Login</Text>
                </TouchableOpacity>

                <View style={styles.headerContainer}>
                    <Text variant="headlineLarge" style={styles.title}>Reset Password</Text>
                    <Text variant="bodyLarge" style={styles.subtitle}>
                        Enter your email address and we'll send you instructions to reset your password.
                    </Text>
                </View>

                <View style={styles.formContainer}>
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

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    {success ? (
                        <Text style={styles.successText}>{success}</Text>
                    ) : null}

                    <Button
                        mode="contained"
                        onPress={handleReset}
                        loading={loading}
                        disabled={loading || !!success}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Send Instructions
                    </Button>

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
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1,
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
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    formContainer: {
        width: '100%',
    },
    input: {
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
    successText: {
        color: 'green',
        marginBottom: 16,
        textAlign: 'center',
    },
});
