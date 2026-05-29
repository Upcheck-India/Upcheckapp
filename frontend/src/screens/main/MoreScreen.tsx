import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    const { user, logout } = useAuthStore();

    const mainMenuItems: MenuItem[] = [
        {
            icon: 'account-circle',
            label: 'Profile',
            route: 'Profile',
            description: 'View and edit your profile',
            color: theme.roles.light.primary,
        },
        {
            icon: 'cog',
            label: 'Settings',
            route: 'Settings',
            description: 'App preferences and notifications',
            color: theme.roles.light.infoBorder,
        },
        {
            icon: 'bell',
            label: 'Notifications',
            route: 'Notifications',
            description: 'Alerts and reminders',
            color: theme.roles.light.warningText,
        },
    ];

    const toolsMenuItems: MenuItem[] = [
        {
            icon: 'calculator-variant',
            label: 'Calculators',
            route: 'CalculatorHub',
            description: 'FCR, feed, ammonia calculations',
            color: theme.roles.light.successText,
        },
        {
            icon: 'chart-timeline-variant',
            label: 'Simulations',
            route: 'SimulationList',
            description: 'Run growth simulations',
            color: theme.roles.light.primary,
        },
        {
            icon: 'chart-box',
            label: 'Reports',
            route: 'Reports',
            description: 'Cycle analysis and financials',
            color: theme.roles.light.infoBorder,
        },
        {
            icon: 'book-open-variant',
            label: 'Disease Encyclopedia',
            route: 'DiseaseList',
            description: 'Browse and search disease library',
            color: theme.roles.light.dangerText,
        },
    ];

    const farmMenuItems: MenuItem[] = [
        {
            icon: 'barn',
            label: 'My Farms',
            route: 'Farms',
            description: 'Manage your farms',
            color: theme.roles.light.primary,
        },
        {
            icon: 'database',
            label: 'Inventory',
            route: 'Inventory',
            description: 'Feed and chemical stock',
            color: theme.roles.light.warningText,
        },
    ];

    const helpMenuItems: MenuItem[] = [
        {
            icon: 'help-circle',
            label: 'Help & Support',
            route: 'Help',
            description: 'FAQs and tutorials',
            color: theme.roles.light.successText,
        },
        {
            icon: 'information',
            label: 'About UpCheck',
            route: 'About',
            description: 'App version and credits',
            color: theme.roles.light.infoBorder,
        },
    ];

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
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
                <Text style={styles.headerTitle}>More</Text>
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
                                {user?.name || user?.email?.split('@')[0] || 'User'}
                            </Text>
                            <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                        </View>
                    </View>
                </Card>

                {/* Main Menu */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <Card style={styles.menuCard}>
                        {mainMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Tools */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tools</Text>
                    <Card style={styles.menuCard}>
                        {toolsMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Farm Management */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Farm Management</Text>
                    <Card style={styles.menuCard}>
                        {farmMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Help */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Help & Info</Text>
                    <Card style={styles.menuCard}>
                        {helpMenuItems.map(renderMenuItem)}
                    </Card>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color={theme.roles.light.dangerText} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* Version */}
                <Text style={styles.versionText}>UpCheck v1.0.0</Text>
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