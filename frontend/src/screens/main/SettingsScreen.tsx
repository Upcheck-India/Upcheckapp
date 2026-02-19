import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, Share } from 'react-native';
import { Text, List, Divider, Button, Portal, Modal, RadioButton, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { supabase } from '../../services/supabase';

const SettingsScreen = ({ navigation }: any) => {
    const { user, deleteAccount, isOAuthUser } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [themeModalVisible, setThemeModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [theme, setTheme] = useState('system');

    // Delete account form
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [secureDeletePw, setSecureDeletePw] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Export
    const [exporting, setExporting] = useState(false);

    const handleNotificationToggle = (val: boolean) => {
        setNotificationsEnabled(val);
    };

    const handleEmailToggle = (val: boolean) => {
        setEmailNotifications(val);
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            const farms = await apiClient.get('/farms') as any[];
            const ponds = await apiClient.get('/ponds/mine') as any[];
            const profile = await apiClient.get(`/profiles/${user?.id}`) as any;
            const exportData = { exportedAt: new Date().toISOString(), profile, farms, ponds };
            await Share.share({ message: JSON.stringify(exportData, null, 2), title: 'UpCheck Data Export' });
        } catch (e: any) {
            Alert.alert('Export failed', e.message ?? 'Could not export data');
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setDeleteError('You must type DELETE (in all caps) to confirm.');
            return;
        }
        if (!isOAuthUser && !deletePassword) {
            setDeleteError('Please enter your current password to confirm.');
            return;
        }
        setDeleting(true);
        setDeleteError('');
        try {
            if (!isOAuthUser && deletePassword) {
                const { error } = await supabase.auth.signInWithPassword({ email: user?.email ?? '', password: deletePassword });
                if (error) { setDeleteError('Incorrect password. Account not deleted.'); setDeleting(false); return; }
            }
            await deleteAccount();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
            setDeleteError(e.message ?? 'Failed to delete account. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const openDeleteModal = () => {
        setDeletePassword('');
        setDeleteConfirmText('');
        setDeleteError('');
        setDeleteModalVisible(true);
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
                    <List.Item title="Theme" description={theme === 'system' ? 'System Default' : theme.charAt(0).toUpperCase() + theme.slice(1)} left={props => <List.Icon {...props} icon="theme-light-dark" />} right={() => <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.grey} />} onPress={() => setThemeModalVisible(true)} />
                </List.Section>

                <Divider />

                <List.Section>
                    <List.Subheader style={styles.subheader}>Notifications</List.Subheader>
                    <List.Item title="Push Notifications" left={props => <List.Icon {...props} icon="bell-outline" />} right={() => <Switch value={notificationsEnabled} onValueChange={handleNotificationToggle} trackColor={{ false: Colors.grey, true: Colors.primary }} />} />
                    <List.Item title="Email Notifications" left={props => <List.Icon {...props} icon="email-outline" />} right={() => <Switch value={emailNotifications} onValueChange={handleEmailToggle} trackColor={{ false: Colors.grey, true: Colors.primary }} />} />
                </List.Section>

                <Divider />

                <List.Section>
                    <List.Subheader style={styles.subheader}>Data & Account</List.Subheader>
                    <List.Item title="Export My Data" description="Download farms, ponds, profile as JSON" left={props => <List.Icon {...props} icon="download-outline" />} right={() => exporting ? <MaterialCommunityIcons name="loading" size={22} color={Colors.grey} /> : <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.grey} />} onPress={handleExportData} />
                    <Divider style={{ marginHorizontal: 16 }} />
                    <List.Item title="Delete Account" description="Permanently erase all your data" titleStyle={{ color: Colors.error }} descriptionStyle={{ color: Colors.textSecondary }} left={props => <List.Icon {...props} icon="delete-forever-outline" color={Colors.error} />} onPress={openDeleteModal} />
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

            {/* Delete Account Modal */}
            <Portal>
                <Modal visible={deleteModalVisible} onDismiss={() => setDeleteModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <View style={styles.deleteHeader}>
                        <MaterialCommunityIcons name="delete-forever" size={40} color={Colors.error} />
                        <Text variant="titleLarge" style={styles.deleteTitle}>Delete Account</Text>
                    </View>
                    <Text style={styles.deleteWarning}>
                        This will permanently delete your account and ALL your data — farms, ponds, cycles, records, transactions. This is irreversible.
                    </Text>

                    {deleteError ? <View style={styles.errorBanner}><MaterialCommunityIcons name="alert-circle" size={16} color={Colors.error} /><Text style={styles.errorText}>{deleteError}</Text></View> : null}

                    {!isOAuthUser && (
                        <>
                            <Text style={styles.fieldLabel}>Current Password</Text>
                            <TextInput value={deletePassword} onChangeText={setDeletePassword} secureTextEntry={secureDeletePw} mode="outlined" style={styles.input} placeholder="Enter your password" left={<TextInput.Icon icon="lock" />} right={<TextInput.Icon icon={secureDeletePw ? 'eye-off' : 'eye'} onPress={() => setSecureDeletePw(!secureDeletePw)} />} outlineColor={Colors.error} activeOutlineColor={Colors.error} />
                        </>
                    )}

                    <Text style={styles.fieldLabel}>Type <Text style={{ fontWeight: 'bold', color: Colors.error }}>DELETE</Text> to confirm</Text>
                    <TextInput value={deleteConfirmText} onChangeText={setDeleteConfirmText} mode="outlined" style={styles.input} placeholder="DELETE" autoCapitalize="characters" outlineColor={deleteConfirmText === 'DELETE' ? Colors.error : Colors.border} activeOutlineColor={Colors.error} />

                    <Button mode="contained" buttonColor={Colors.error} onPress={handleDeleteAccount} loading={deleting} disabled={deleting || deleteConfirmText !== 'DELETE'} style={{ marginTop: 16 }} labelStyle={{ color: '#fff', fontWeight: 'bold' }}>
                        {deleting ? 'Deleting…' : 'Delete My Account Forever'}
                    </Button>
                    <Button mode="text" onPress={() => setDeleteModalVisible(false)} style={{ marginTop: 8 }}>Cancel</Button>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.padding, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backButton: { marginRight: 16 },
    headerTitle: { fontWeight: 'bold' },
    content: { paddingBottom: 40 },
    subheader: { backgroundColor: Colors.background, color: Colors.textSecondary, fontWeight: '600', fontSize: 13, marginTop: 8 },
    modalContent: { backgroundColor: Colors.modalBackground, padding: 24, margin: 20, borderRadius: 16 },
    modalTitle: { marginBottom: 16, fontWeight: 'bold', textAlign: 'center' },
    deleteHeader: { alignItems: 'center', marginBottom: 12 },
    deleteTitle: { fontWeight: 'bold', color: Colors.error, marginTop: 8 },
    deleteWarning: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 16, textAlign: 'center' },
    errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorLight, padding: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
    errorText: { flex: 1, color: Colors.error, fontSize: 13 },
    fieldLabel: { fontSize: 13, color: Colors.text, fontWeight: '500', marginBottom: 6 },
    input: { marginBottom: 12, backgroundColor: Colors.surface },
});

export default SettingsScreen;
