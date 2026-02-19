import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TwoFASetupScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <MaterialCommunityIcons name="shield-lock-outline" size={72} color={Colors.grey} style={styles.icon} />
                <Text variant="headlineMedium" style={styles.title}>Two-Factor Authentication</Text>
                <Text style={styles.body}>
                    TOTP-based 2FA is not yet available in this version of the app.
                    {'\n\n'}
                    Your account is protected by Supabase Auth, which supports secure session management and Google OAuth sign-in.
                    {'\n\n'}
                    TOTP 2FA will be added in a future update.
                </Text>
                <GradientButton title="Go Back" onPress={() => navigation.goBack()} icon="arrow-left" style={styles.btn} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: {
        flex: 1,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: { marginBottom: 24 },
    title: {
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: Colors.text,
    },
    body: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    btn: { width: '100%' },
});

export default TwoFASetupScreen;
