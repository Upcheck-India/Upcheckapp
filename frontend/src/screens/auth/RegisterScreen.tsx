import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';

// ─── Password Strength Calculator ────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    if (score <= 2) return { score: score / 6, label: 'Weak', color: Colors.error };
    if (score <= 4) return { score: score / 6, label: 'Fair', color: Colors.warning };
    return { score: score / 6, label: 'Strong', color: Colors.success };
}

const RegisterScreen = ({ navigation }: any) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [loading, setLoading] = useState(false);

    const { register } = useAuthStore();

    const passwordStrength = getPasswordStrength(password);

    const handleRegister = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter your full name');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Please enter a password');
            return;
        }
        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
            Alert.alert('Error', 'Password must contain uppercase, lowercase, number, and special character');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await register(email.trim(), password, fullName.trim(), phoneNumber.trim() || undefined);
            Alert.alert(
                'Registration Successful',
                'Please check your email for a verification link before signing in.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Could not create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Text variant="headlineMedium" style={styles.headerTitle}>Create Account</Text>
                        <Text variant="bodyMedium" style={styles.headerSubtitle}>
                            Join Upcheck to manage your farm
                        </Text>
                    </LinearGradient>

                    <View style={styles.content}>
                        <TextInput
                            label="Full Name *"
                            value={fullName}
                            onChangeText={setFullName}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="account" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

                        <TextInput
                            label="Email Address *"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="email" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

                        <TextInput
                            label="Phone Number (optional)"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="phone" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

                        <TextInput
                            label="Password *"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secureTextEntry}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="lock" />}
                            right={
                                <TextInput.Icon
                                    icon={secureTextEntry ? 'eye-off' : 'eye'}
                                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                                />
                            }
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

                        {/* Password Strength Indicator */}
                        {password.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <ProgressBar
                                    progress={passwordStrength.score}
                                    color={passwordStrength.color}
                                    style={styles.strengthBar}
                                />
                                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                    {passwordStrength.label}
                                </Text>
                            </View>
                        )}

                        <TextInput
                            label="Confirm Password *"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={secureTextEntry}
                            mode="outlined"
                            style={styles.input}
                            left={<TextInput.Icon icon="lock-check" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />

                        <GradientButton
                            title="Create Account"
                            onPress={handleRegister}
                            loading={loading}
                            disabled={loading}
                            icon="account-plus"
                            style={styles.registerButton}
                        />

                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={styles.loginLink}>Sign In</Text>
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
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: Colors.textLight,
        marginBottom: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 24,
    },
    input: {
        marginBottom: 12,
        backgroundColor: Colors.surface,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: -4,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.lightGrey,
    },
    strengthLabel: {
        marginLeft: 12,
        fontSize: 12,
        fontWeight: '700',
    },
    registerButton: {
        marginTop: 8,
        marginBottom: 16,
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    loginText: {
        color: Colors.textSecondary,
        fontSize: 15,
    },
    loginLink: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
});

export default RegisterScreen;
