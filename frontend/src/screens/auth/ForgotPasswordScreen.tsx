import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { AuthService } from '../../services/auth';

const ForgotPasswordScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await AuthService.forgotPassword(email);
            Alert.alert('Success', 'If an account exists, a password reset email has been sent.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to request reset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>

                <TextInput
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Icon icon="email" />}
                />

                <GradientButton
                    title="Send Reset Link"
                    onPress={handleReset}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                />

                <GradientButton
                    title="Back to Login"
                    onPress={() => navigation.goBack()}
                    variant="secondary"
                    style={styles.secondaryButton}
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
    secondaryButton: {
        marginTop: 16,
    }
});

export default ForgotPasswordScreen;
