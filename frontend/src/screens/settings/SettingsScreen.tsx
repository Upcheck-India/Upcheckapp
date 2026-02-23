import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';

export const SettingsScreen = ({ navigation }: any) => {
    const [offlineSync, setOfflineSync] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(false);

    // In a real app we'd dispatch a logout action
    const handleLogout = () => {
        navigation.navigate('Auth', { screen: 'Login' });
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>App Preferences</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="cloud-sync" size={24} color={Colors.primary} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Offline Sync</Text>
                                <Text style={styles.settingDesc}>Cache data for offline usage</Text>
                            </View>
                        </View>
                        <Switch
                            value={offlineSync}
                            onValueChange={setOfflineSync}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                        />
                    </View>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="bell-ring" size={24} color={Colors.primary} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Push Notifications</Text>
                                <Text style={styles.settingDesc}>Alerts for water quality & feeding</Text>
                            </View>
                        </View>
                        <Switch
                            value={pushNotifications}
                            onValueChange={setPushNotifications}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                        />
                    </View>

                    <View style={[styles.settingRow, styles.noBottomBorder]}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="email" size={24} color={Colors.primary} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Email Summaries</Text>
                                <Text style={styles.settingDesc}>Weekly performance reports</Text>
                            </View>
                        </View>
                        <Switch
                            value={emailAlerts}
                            onValueChange={setEmailAlerts}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                        />
                    </View>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>About Upcheck</Text>
                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkLabel}>Privacy Policy</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkLabel}>Terms of Service</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
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
        paddingVertical: spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    backBtn: { padding: spacing.md },
    title: { ...typography.h3, color: Colors.textPrimary },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    section: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    sectionTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginBottom: spacing.md,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        marginBottom: spacing.sm,
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
        marginLeft: spacing.md,
        flex: 1,
    },
    settingLabel: {
        ...typography.bodyLarge,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    settingDesc: {
        ...typography.bodySmall,
        color: Colors.textSecondary,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    linkLabel: {
        ...typography.bodyLarge,
        color: Colors.textPrimary,
    },
    versionText: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
    },
    logoutBtn: {
        marginTop: spacing.md,
        borderColor: Colors.error,
    },
});
