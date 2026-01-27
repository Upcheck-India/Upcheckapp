import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppInput } from '../../components/AppInput';
import { Colors } from '../../constants/Colors';

const RegisterScreen = () => {
    const navigation = useNavigation<any>();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    const handleRegister = () => {
        // TODO: Implement registration logic
        console.log('Register pressed');
        navigation.navigate('OtpVerification', { email });
    };

    const handleLoginNavigate = () => {
        navigation.navigate('Login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Join the Upcheck community</Text>
                </View>

                <View style={styles.form}>
                    <AppInput
                        label="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                        left={<TextInput.Icon icon="account" />}
                    />

                    <AppInput
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        left={<TextInput.Icon icon="email" />}
                    />

                    <AppInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={secureTextEntry}
                        left={<TextInput.Icon icon="lock" />}
                        right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                    />

                    <AppInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={secureTextEntry}
                        left={<TextInput.Icon icon="lock-check" />}
                    />
                </View>

                <Button mode="contained" onPress={handleRegister} style={styles.button} buttonColor={Colors.primary}>
                    Sign Up
                </Button>

                <View style={styles.footer}>
                    <Text>Already have an account? </Text>
                    <TouchableOpacity onPress={handleLoginNavigate}>
                        <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Login</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    content: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        color: Colors.primary,
    },
    subtitle: {
        color: Colors.textSecondary,
        marginTop: 8,
    },
    form: {
        marginBottom: 24,
    },
    button: {
        paddingVertical: 6,
        marginBottom: 24,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    }
});

export default RegisterScreen;
