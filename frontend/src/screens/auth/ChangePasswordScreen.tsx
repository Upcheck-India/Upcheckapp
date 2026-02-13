import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { AuthService } from '../../services/auth';
import { GradientButton } from '../../components/GradientButton';
import { useAuthStore } from '../../store/authStore';

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

const ChangePasswordScreen = ({ navigation }: any) => {
    const { accessToken, logout } = useAuthStore();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureOld, setSecureOld] = useState(true);
    const [secureNew, setSecureNew] = useState(true);
    const [loading, setLoading] = useState(false);

    const passwordStrength = getPasswordStrength(newPassword);

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Error', 'New password must be at least 8 characters');
            return;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
            Alert.alert('Error', 'Password must contain uppercase, lowercase, number, and special character');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }
        if (oldPassword === newPassword) {
            Alert.alert('Error', 'New password must be different from current password');
            return;
        }

        setLoading(true);
        try {
            await AuthService.changePassword(accessToken!, oldPassword, newPassword);
            Alert.alert(
                'Success',
                'Password changed successfully. Please login again.',
                [{ text: 'OK', onPress: () => logout() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change password');
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
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Text variant="headlineMedium" style={styles.title}>Change Password</Text>
                    <Text style={styles.subtitle}>
                        Choose a strong password with at least 8 characters including uppercase, lowercase, number, and special character.
                    </Text>

                    <TextInput
                        label="Current Password"
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        secureTextEntry={secureOld}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="lock" />}
                        right={
                            <TextInput.Icon
                                icon={secureOld ? 'eye-off' : 'eye'}
                                onPress={() => setSecureOld(!secureOld)}
                            />
                        }
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />

                    <TextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={secureNew}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="lock-plus" />}
                        right={
                            <TextInput.Icon
                                icon={secureNew ? 'eye-off' : 'eye'}
                                onPress={() => setSecureNew(!secureNew)}
                            />
                        }
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />

                    {newPassword.length > 0 && (
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
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={secureNew}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="lock-check" />}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />

                    <GradientButton
                        title="Change Password"
                        onPress={handleChangePassword}
                        loading={loading}
                        disabled={loading}
                        icon="lock-reset"
                        style={styles.button}
                    />
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
    content: {
        padding: 24,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: Colors.text,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    input: {
        marginBottom: 16,
        backgroundColor: Colors.surface,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: -8,
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
    button: {
        marginTop: 8,
    },
});

export default ChangePasswordScreen;
