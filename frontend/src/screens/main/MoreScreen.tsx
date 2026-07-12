import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

interface MenuItem {
    icon: string;
    label: string;
    route?: string;
    description?: string;
    color: string;
    action?: () => void;
}

export const MoreScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { user, logout } = useAuthStore();

    const mainMenuItems: MenuItem[] = [
        {
            icon: 'account-circle',
            label: t('home.moreProfile'),
            route: 'Profile',
            description: t('home.moreProfileDesc'),
            color: theme.roles.light.primary,
        },
        {
            icon: 'cog',
            label: t('home.moreSettings'),
            route: 'Settings',
            description: t('home.moreSettingsDesc'),
            color: theme.roles.light.infoBorder,
        },
        {
            icon: 'bell',
            label: t('home.moreNotifications'),
            route: 'Notifications',
            description: t('home.moreNotificationsDesc'),
            color: theme.roles.light.warningText,
        },
    ];

    const toolsMenuItems: MenuItem[] = [
        {
            icon: 'calculator-variant',
            label: t('home.moreCalculators'),
            route: 'CalculatorHub',
            description: t('home.moreCalculatorsDesc'),
            color: theme.roles.light.successText,
        },
        {
            icon: 'chart-timeline-variant',
            label: t('home.moreSimulations'),
            route: 'SimulationList',
            description: t('home.moreSimulationsDesc'),
            color: theme.roles.light.primary,
        },
        // "Reports" deliberately removed — it duplicates the Reports bottom tab
        // (docs/UI_UX_AUDIT.md Tier 1 #3: two IA entries to the same screen).
        {
            icon: 'book-open-variant',
            label: t('home.moreDiseaseEncyclopedia'),
            route: 'DiseaseList',
            description: t('home.moreDiseaseEncyclopediaDesc'),
            color: theme.roles.light.dangerText,
        },
        {
            icon: 'newspaper-variant-outline',
            label: t('home.moreNews'),
            route: 'NewsList',
            description: t('home.moreNewsDesc'),
            color: theme.roles.light.infoBorder,
        },
        {
            icon: 'database-search',
            label: t('home.moreReference'),
            route: 'Reference',
            description: t('home.moreReferenceDesc'),
            color: theme.roles.light.successText,
        },
    ];

    const farmMenuItems: MenuItem[] = [
        // "My Farms" deliberately removed — it duplicates the Farms bottom tab
        // (docs/UI_UX_AUDIT.md Tier 1 #3: two IA entries to the same screen).
        {
            icon: 'database',
            label: t('home.moreInventory'),
            route: 'Inventory',
            description: t('home.moreInventoryDesc'),
            color: theme.roles.light.warningText,
        },
        {
            icon: 'storefront-outline',
            label: t('home.moreShop'),
            route: 'Shop',
            description: t('home.moreShopDesc'),
            color: theme.roles.light.primary,
        },
        {
            icon: 'food-variant',
            label: t('home.moreFeedProducts'),
            route: 'FeedProducts',
            description: t('home.moreFeedProductsDesc'),
            color: theme.roles.light.successText,
        },
    ];

    const helpMenuItems: MenuItem[] = [
        {
            icon: 'help-circle',
            label: t('home.moreHelp'),
            route: 'Help',
            description: t('home.moreHelpDesc'),
            color: theme.roles.light.successText,
        },
        {
            icon: 'information',
            label: t('home.moreAbout'),
            route: 'About',
            description: t('home.moreAboutDesc'),
            color: theme.roles.light.infoBorder,
        },
    ];

    const handleLogout = () => {
        Alert.alert(
            t('home.moreSignOutTitle'),
            t('home.moreSignOutMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.signOut'), style: 'destructive', onPress: logout },
            ]
        );
    };

    const renderMenuItem = (item: MenuItem) => (
        <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => {
                if (item.action) {
                    item.action();
                } else if (item.route) {
                    navigation.navigate(item.route);
                }
            }}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.description && (
                    <Text style={styles.menuDescription}>{item.description}</Text>
                )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textDisabled} />
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('home.moreTitle')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* User Info */}
                <Card style={styles.userCard}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatarContainer}>
                            <MaterialCommunityIcons name="account" size={32} color={theme.roles.light.primary} />
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>
                                {user?.name || user?.email?.split('@')[0] || t('home.moreUserFallback')}
                            </Text>
                            <Text style={styles.userEmail}>{user?.email || t('home.moreEmailFallback')}</Text>
                        </View>
                    </View>
                </Card>

                {/* Main Menu */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('home.moreSectionAccount')}</Text>
                    <Card style={styles.menuCard}>
                        {mainMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Tools */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('home.moreSectionTools')}</Text>
                    <Card style={styles.menuCard}>
                        {toolsMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Farm Management */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('home.moreSectionFarm')}</Text>
                    <Card style={styles.menuCard}>
                        {farmMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Help */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('home.moreSectionHelp')}</Text>
                    <Card style={styles.menuCard}>
                        {helpMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color={theme.roles.light.dangerText} />
                    <Text style={styles.logoutText}>{t('common.signOut')}</Text>
                </TouchableOpacity>

                {/* Version */}
                <Text style={styles.versionText}>{t('home.moreVersion')}</Text>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingVertical: theme.spacing[4],
        paddingHorizontal: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    headerTitle: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    userCard: {
        marginBottom: theme.spacing[6],
        padding: theme.spacing[4],
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.roles.light.infoBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing[4],
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
    },
    userEmail: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
    section: {
        marginBottom: theme.spacing[4],
    },
    sectionTitle: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[2],
        marginLeft: theme.spacing[2],
    },
    menuCard: {
        padding: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing[4],
    },
    menuContent: {
        flex: 1,
    },
    menuLabel: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    menuDescription: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[4],
        marginTop: theme.spacing[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.dangerText,
        backgroundColor: theme.roles.light.dangerBg,
    },
    logoutText: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.dangerText,
        marginLeft: theme.spacing[2],
    },
    versionText: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textDisabled,
        textAlign: 'center',
        marginTop: theme.spacing[4],
    },
});
