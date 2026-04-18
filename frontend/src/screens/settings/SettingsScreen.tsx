import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';

import { useAuthStore } from '../../store/authStore';

export const SettingsScreen = ({ navigation }: any) => {
    const [offlineSync, setOfflineSync] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedOfflineSync = await AsyncStorage.getItem('offlineSync');
                const storedPushNotifications = await AsyncStorage.getItem('pushNotifications');
                const storedEmailAlerts = await AsyncStorage.getItem('emailAlerts');

                if (storedOfflineSync !== null) setOfflineSync(JSON.parse(storedOfflineSync));
                if (storedPushNotifications !== null) setPushNotifications(JSON.parse(storedPushNotifications));
                if (storedEmailAlerts !== null) setEmailAlerts(JSON.parse(storedEmailAlerts));
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        };
        loadSettings();
    }, []);

    const handleSettingChange = async (key: string, value: boolean, setter: (val: boolean) => void) => {
        setter(value);
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to save ${key}`, e);
        }
    };

    const handleLogout = () => {
        useAuthStore.getState().logout();
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>App Preferences</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="cloud-sync" size={24} color={theme.roles.light.primary} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Offline Sync</Text>
                                <Text style={styles.settingDesc}>Cache data for offline usage</Text>
                            </View>
                        </View>
                        <Switch
                            value={offlineSync}
                            onValueChange={(val) => handleSettingChange('offlineSync', val, setOfflineSync)}
                            trackColor={{ false: theme.roles.light.borderDefault, true: theme.roles.light.primary }}
                        />
                    </View>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="bell-ring" size={24} color={theme.roles.light.primary} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Push Notifications</Text>
                                <Text style={styles.settingDesc}>Alerts for water quality & feeding</Text>
                            </View>
                        </View>
                        <Switch
                            value={pushNotifications}
                            onValueChange={(val) => handleSettingChange('pushNotifications', val, setPushNotifications)}
                            trackColor={{ false: theme.roles.light.borderDefault, true: theme.roles.light.primary }}
                        />
                    </View>

                    <View style={[styles.settingRow, styles.noBottomBorder]}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="email" size={24} color={theme.roles.light.primary} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Email Summaries</Text>
                                <Text style={styles.settingDesc}>Weekly performance reports</Text>
                            </View>
                        </View>
                        <Switch
                            value={emailAlerts}
                            onValueChange={(val) => handleSettingChange('emailAlerts', val, setEmailAlerts)}
                            trackColor={{ false: theme.roles.light.borderDefault, true: theme.roles.light.primary }}
                        />
                    </View>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>About Upcheck</Text>
                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkLabel}>Privacy Policy</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkLabel}>Terms of Service</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.linkRow, styles.noBottomBorder]}>
                        <Text style={styles.linkLabel}>App Version</Text>
                        <Text style={styles.versionText}>v1.0.0</Text>
                    </TouchableOpacity>
                </Card>

                <Button
                    variant="outlined"
                    title="Sign Out"
                    onPress={handleLogout}
                    style={styles.logoutBtn}
                />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    section: {
        marginBottom: theme.spacing[4],
        padding: theme.spacing[4],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        marginBottom: theme.spacing[3],
    },
    noBottomBorder: {
        borderBottomWidth: 0,
        marginBottom: 0,
        paddingBottom: 0,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingTextContainer: {
        marginLeft: theme.spacing[4],
        flex: 1,
    },
    settingLabel: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    settingDesc: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    linkLabel: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
    },
    versionText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    logoutBtn: {
        marginTop: theme.spacing[4],
        borderColor: theme.roles.light.dangerText,
    },
});
