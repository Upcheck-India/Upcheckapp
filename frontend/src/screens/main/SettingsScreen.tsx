import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { Text, List, Divider, Button, Portal, Modal, RadioButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

const SettingsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [theme, setTheme] = useState('system'); // system, light, dark
    const [language, setLanguage] = useState('en');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);

    // Modal states
    const [themeModalVisible, setThemeModalVisible] = useState(false);
    const [langModalVisible, setLangModalVisible] = useState(false);

    const handleUpdatePreference = async (key: string, value: any) => {
        try {
            // Optimistic update
            if (key === 'notifications') setNotificationsEnabled(value);
            if (key === 'emailNotifications') setEmailNotifications(value);

            await apiClient.post('/auth/preferences', { key, value });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update settings');
            // Revert?
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure update you want to delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiClient.delete('/auth/account');
                            Alert.alert('Account Deleted', 'Your account has been deleted.');
                            // The app should handle the 401/logout via AuthContext or similar mechanism globally
                            // or we can force logout here invocation if available via props/context.
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete account');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text variant="headlineSmall" style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <List.Section>
                    <List.Subheader style={styles.subheader}>Appearance</List.Subheader>
                    <List.Item
                        title="Theme"
                        description={theme.charAt(0).toUpperCase() + theme.slice(1)}
                        left={props => <List.Icon {...props} icon="theme-light-dark" />}
                        right={props => <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.grey} />}
                        onPress={() => setThemeModalVisible(true)}
                    />
                    <List.Item
                        title="Language"
                        description={language === 'en' ? 'English' : 'Español'}
                        left={props => <List.Icon {...props} icon="translate" />}
                        right={props => <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.grey} />}
                        onPress={() => setLangModalVisible(true)}
                    />
                </List.Section>

                <Divider />

                <List.Section>
                    <List.Subheader style={styles.subheader}>Notifications</List.Subheader>
                    <List.Item
                        title="Push Notifications"
                        left={props => <List.Icon {...props} icon="bell-outline" />}
                        right={() => (
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={(val) => handleUpdatePreference('notifications', val)}
                                trackColor={{ false: Colors.grey, true: Colors.primary }}
                            />
                        )}
                    />
                    <List.Item
                        title="Email Notifications"
                        left={props => <List.Icon {...props} icon="email-outline" />}
                        right={() => (
                            <Switch
                                value={emailNotifications}
                                onValueChange={(val) => handleUpdatePreference('emailNotifications', val)}
                                trackColor={{ false: Colors.grey, true: Colors.primary }}
                            />
                        )}
                    />
                </List.Section>

                <Divider />

                <List.Section>
                    <List.Subheader style={styles.subheader}>Account</List.Subheader>
                    <List.Item
                        title="Export Data"
                        description="Download all your data"
                        left={props => <List.Icon {...props} icon="download-outline" />}
                        onPress={() => Alert.alert('Coming Soon', 'Data export feature is coming soon.')}
                    />
                    <List.Item
                        title="Delete Account"
                        description="Permanently delete your account"
                        titleStyle={{ color: Colors.error }}
                        left={props => <List.Icon {...props} icon="delete-outline" color={Colors.error} />}
                        onPress={handleDeleteAccount}
                    />
                </List.Section>

            </ScrollView>

            {/* Theme Modal */}
            <Portal>
                <Modal visible={themeModalVisible} onDismiss={() => setThemeModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Choose Theme</Text>
                    <RadioButton.Group onValueChange={val => { setTheme(val); setThemeModalVisible(false); }} value={theme}>
                        <RadioButton.Item label="System Default" value="system" />
                        <RadioButton.Item label="Light" value="light" />
                        <RadioButton.Item label="Dark" value="dark" />
                    </RadioButton.Group>
                </Modal>
            </Portal>

            {/* Language Modal */}
            <Portal>
                <Modal visible={langModalVisible} onDismiss={() => setLangModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Choose Language</Text>
                    <RadioButton.Group onValueChange={val => { setLanguage(val); setLangModalVisible(false); }} value={language}>
                        <RadioButton.Item label="English" value="en" />
                        <RadioButton.Item label="Español" value="es" />
                    </RadioButton.Group>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Layout.padding,
        paddingVertical: 12,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    backButton: { marginRight: 16 },
    headerTitle: { fontWeight: 'bold' },
    content: { paddingBottom: 40 },
    subheader: {
        backgroundColor: Colors.background,
        color: Colors.textSecondary,
        fontWeight: '600',
        fontSize: 13,
        marginTop: 8,
    },
    modalContent: {
        backgroundColor: Colors.modalBackground,
        padding: 20,
        margin: 20,
        borderRadius: 12,
    },
    modalTitle: {
        marginBottom: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    }
});

export default SettingsScreen;
