import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { AuthService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

const ChangePasswordScreen = ({ navigation }: any) => {
    const { accessToken, logout } = useAuthStore();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    const handleChange = async () => {
        if (!oldPassword || !newPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await AuthService.changePassword(accessToken!, oldPassword, newPassword);
            Alert.alert('Success', 'Password changed successfully. You will be logged out.', [
                { text: 'OK', onPress: () => logout() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>Change Password</Text>

                <TextInput
                    label="Current Password"
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={secureTextEntry}
                    mode="outlined"
                    style={styles.input}
                    right={<TextInput.Icon icon="eye" onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                />

                <TextInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={secureTextEntry}
                    mode="outlined"
                    style={styles.input}
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
                    title="Update Password"
                    onPress={handleChange}
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

export default ChangePasswordScreen;
