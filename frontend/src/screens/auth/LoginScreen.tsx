import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { AuthService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }: any) => {
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // Replace with actual Web Client ID
        iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID', // Replace with actual iOS Client ID
        androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID', // Replace with actual Android Client ID
    });

    const { isLoading: loading } = useAuthStore();

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            handleGoogleLogin(id_token);
        } else if (response?.type === 'error') {
            Alert.alert('Authentication Error', 'Failed to sign in with Google');
        }
    }, [response]);

    const { login } = useAuthStore();

    const handleGoogleLogin = async (token: string) => {
        try {
            const data = await login(token);
            if (data?.requires2fa) {
                // If 2FA is required, navigate to 2FA screen with temp token
                navigation.navigate('TwoFALogin', { tempToken: data.temp_token });
            }
        } catch (error: any) {
            console.error('Google login error:', error);
            Alert.alert('Login Failed', error.message || 'Could not verify user');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text variant="headlineMedium" style={styles.headerTitle}>Welcome to Upcheck</Text>
                <Text variant="bodyMedium" style={styles.headerSubtitle}>Sign in to continue</Text>
            </LinearGradient>

            <View style={styles.content}>
                <Text style={styles.subtitle}>
                    Securely sign in with your Google account to access your farm data.
                </Text>

                <GradientButton
                    title="Sign in with Google"
                    onPress={() => promptAsync()}
                    loading={loading}
                    disabled={!request || loading}
                    icon="google"
                    style={styles.button}
                />

                <Button
                    mode="text"
                    textColor={Colors.primary}
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotBtn}
                >
                    Forgot Password?
                </Button>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 60,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: 40,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: Colors.textLight,
        marginBottom: 8,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    subtitle: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginBottom: 48,
        fontSize: 16,
        lineHeight: 24,
    },
    button: {
        width: '100%',
        maxWidth: 300,
    },
    forgotBtn: {
        marginTop: 16,
    }
});

export default LoginScreen;
