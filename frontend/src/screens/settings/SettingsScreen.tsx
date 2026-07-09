import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { LANGUAGES } from '../../i18n/languages';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import { pushApi } from '../../api/push';

import { useAuthStore } from '../../store/authStore';

export const SettingsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    // ponytail: offlineSync + emailAlerts toggles removed (no gate/backend read them —
    // offline queueing already always runs via saveRecord, and there's no weekly-email
    // feature to switch). pushNotifications is the one toggle with a real effect.
    const [pushNotifications, setPushNotifications] = useState(true);
    const [isTogglingPush, setIsTogglingPush] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedPushNotifications = await AsyncStorage.getItem('pushNotifications');
                if (storedPushNotifications !== null) setPushNotifications(JSON.parse(storedPushNotifications));
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        };
        loadSettings();
    }, []);

    const handlePushToggle = async (value: boolean) => {
        setIsTogglingPush(true);
        try {
            if (value) {
                const token = await registerForPushNotificationsAsync();
                if (!token) {
                    Alert.alert(t('common.error'), t('settings.pushPermissionDenied', 'Push notifications need permission in your device settings.'));
                    setIsTogglingPush(false);
                    return;
                }
                await pushApi.registerToken(token);
            } else {
                await pushApi.unregister();
            }
            setPushNotifications(value);
            await AsyncStorage.setItem('pushNotifications', JSON.stringify(value));
        } catch (e: any) {
            console.error('Failed to update push notification setting', e);
            Alert.alert(t('common.error'), t('settings.pushToggleError', 'Could not update push notification setting. Please try again.'));
        } finally {
            setIsTogglingPush(false);
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
                <Text style={styles.title}>{t('settings.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* ── Language selector ── */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
                    <Text style={styles.settingDesc}>{t('settings.languageDesc')}</Text>
                    <View style={styles.languageRow}>
                        {LANGUAGES.map((lang) => {
                            const isActive = i18n.language === lang.code;
                            return (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.languageOption,
                                        isActive && styles.languageOptionActive,
                                    ]}
                                    onPress={() => i18n.changeLanguage(lang.code)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.languageLabel,
                                            isActive && styles.languageLabelActive,
                                        ]}
                                    >
                                        {lang.nativeLabel}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>

                    <View style={[styles.settingRow, styles.noBottomBorder]}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="bell-ring" size={24} color={theme.roles.light.primary} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>{t('settings.pushNotifications')}</Text>
                                <Text style={styles.settingDesc}>{t('settings.pushNotificationsDesc')}</Text>
                            </View>
                        </View>
                        <Switch
                            value={pushNotifications}
                            onValueChange={handlePushToggle}
                            disabled={isTogglingPush}
                            trackColor={{ false: theme.roles.light.borderDefault, true: theme.roles.light.primary }}
                        />
                    </View>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.security')}</Text>
                    <TouchableOpacity
                        style={[styles.linkRow, styles.noBottomBorder]}
                        onPress={() => navigation.navigate('TwoFactor')}
                    >
                        <Text style={styles.linkLabel}>{t('settings.twoFactor')}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textSecondary} />
                    </TouchableOpacity>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
                        <Text style={styles.linkLabel}>{t('settings.privacyPolicy')}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Terms')}>
                        <Text style={styles.linkLabel}>{t('settings.termsOfService')}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.linkRow, styles.noBottomBorder]}>
                        <Text style={styles.linkLabel}>{t('common.version')}</Text>
                        <Text style={styles.versionText}>v1.0.0</Text>
                    </TouchableOpacity>
                </Card>

                <Button
                    variant="outlined"
                    title={t('common.signOut')}
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
    languageRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[2],
        marginTop: theme.spacing[3],
    },
    languageOption: {
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        alignItems: 'center',
    },
    languageOptionActive: {
        borderColor: theme.roles.light.primary,
        backgroundColor: theme.roles.light.primary + '15',
    },
    languageLabel: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textSecondary,
    },
    languageLabelActive: {
        color: theme.roles.light.primary,
        fontWeight: '600',
    },
});
