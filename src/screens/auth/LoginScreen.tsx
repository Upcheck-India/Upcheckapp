import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppInput } from '../../components/AppInput';
import { Colors } from '../../constants/Colors';
import { AuthService } from '../../services/auth';

const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    const handleLogin = () => {
        // TODO: Implement login logic
        console.log('Login pressed');
        navigation.replace('Main');
    };

    const handleLoginWithOtp = async () => {
        try {
            await AuthService.sendOtp({ email: email || undefined, phone: phone || undefined });
            navigation.navigate('OtpVerification', { email, phone });
        } catch (error) {
            alert('Failed to send OTP');
        }
    };

    const handleRegisterNavigate = () => {
        navigation.navigate('Register');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text variant="headlineLarge" style={styles.logoText}>UPCHECK</Text>
                    <Text variant="bodyMedium" style={styles.tagline}>Smart Shrimp Farming</Text>
                </View>

                <Text variant="titleLarge" style={styles.title}>Welcome Back</Text>

                <View style={styles.inputContainer}>
                    <AppInput
                        label="Account / Email"
                        value={email}
                        onChangeText={setEmail}
                        left={<TextInput.Icon icon="account" />}
                    />

                    <AppInput
                        label="Phone Number (optional)"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        left={<TextInput.Icon icon="phone" />}
                    />

                    <AppInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={secureTextEntry}
                        left={<TextInput.Icon icon="lock" />}
                        right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                    />

                    <TouchableOpacity onPress={() => console.log('Forgot Password')}>
                        <Text style={[styles.forgotPassword, { color: Colors.primary }]}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <Button mode="contained" onPress={handleLogin} style={styles.button} buttonColor={Colors.primary}>
                    Login
                </Button>

                <View style={styles.dividerContainer}>
                    <Divider style={styles.divider} />
                    <Text style={styles.orText}>OR</Text>
                    <Divider style={styles.divider} />
                </View>

                <Button mode="outlined" onPress={() => console.log('Login with Email')} style={[styles.button, { borderColor: Colors.primary }]} textColor={Colors.primary}>
                    Login with Email
                </Button>

                <Button mode="contained-tonal" onPress={handleLoginWithOtp} style={[styles.button, { borderColor: Colors.primary }]} textColor={Colors.primary}>
                    Login with OTP
                </Button>

                <View style={styles.footer}>
                    <Text>Don't have an Account? </Text>
                    <TouchableOpacity onPress={handleRegisterNavigate}>
                        <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Register</Text>
                    </TouchableOpacity>
                </View>

                {/* Network Status & Language Placeholders */}
                <View style={styles.statusBar}>
                    <Text variant="labelSmall">EN</Text>
                    <Text variant="labelSmall">0 KB/s</Text>
                </View>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoText: {
        fontWeight: 'bold',
        color: Colors.primary,
        marginTop: 12,
    },
    logo: {
        width: 80,
        height: 80,
    },
    tagline: {
        color: Colors.textSecondary,
        marginTop: 4,
    },
    title: {
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    forgotPassword: {
        textAlign: 'right',
        marginTop: 4,
    },
    button: {
        marginTop: 12,
        paddingVertical: 6,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
    },
    orText: {
        marginHorizontal: 16,
        color: Colors.grey,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: 20,
    }
});

export default LoginScreen;
