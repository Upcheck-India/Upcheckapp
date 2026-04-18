import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { reportsApi, DashboardSummary } from '../../api/reports';

export const HomeScreen = ({ navigation }: any) => {
    const { user, logout } = useAuthStore();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                // Fetch summary (pass undefined or selected farmId if needed later)
                const { data } = await reportsApi.getDashboardSummary();
                setSummary(data);
            } catch (error) {
                console.error("Failed to fetch dashboard summary", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, []);

    const quickActions = [
        { icon: 'barn' as const, label: 'Farms', screen: 'Farms', isTab: true, color: theme.roles.light.primary },
        { icon: 'calculator-variant-outline' as const, label: 'Calculators', screen: 'CalculatorHub', isTab: false, color: theme.roles.light.infoBorder },
        { icon: 'chart-timeline-variant' as const, label: 'Simulate', screen: 'SimulationList', isTab: false, color: theme.roles.light.successText },
        { icon: 'cog-outline' as const, label: 'Settings', screen: 'Settings', isTab: false, color: theme.roles.light.warningText },
    ];

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.userName}>
                        {user?.name || user?.email?.split('@')[0] || 'Farmer'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Settings') ?? navigation.navigate('Settings')} style={styles.avatar}>
                    <MaterialCommunityIcons name="account-circle" size={40} color={theme.roles.light.primary} />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Dashboard Summary</Text>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                </View>
            ) : summary ? (
                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="water" size={32} color={theme.roles.light.primary} />
                        <Text style={styles.statValue}>{summary.activePondsCount}</Text>
                        <Text style={styles.statLabel}>Active Ponds</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="water-outline" size={32} color={theme.roles.light.textSecondary} />
                        <Text style={styles.statValue}>{summary.totalPondsCount}</Text>
                        <Text style={styles.statLabel}>Total Ponds</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="alert" size={32} color={theme.roles.light.dangerText} />
                        <Text style={styles.statValue}>{summary.lowStockAlerts}</Text>
                        <Text style={styles.statLabel}>Low Stock Alerts</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="corn" size={32} color={theme.roles.light.warningText} />
                        <Text style={styles.statValue}>{summary.todayFeedUsage}</Text>
                        <Text style={styles.statLabel}>Today's Feed (kg)</Text>
                    </Card>
                </View>
            ) : (
                <Card style={styles.infoCard}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={theme.roles.light.infoBorder} />
                    <Text style={styles.infoText}>
                        No farm data available. Create a farm to get started!
                    </Text>
                </Card>
            )}

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.grid}>
                {quickActions.map((action) => (
                    <TouchableOpacity
                        key={action.label}
                        style={styles.actionCard}
                        onPress={() => action.isTab ? navigation.navigate(action.screen) : navigation.getParent()?.navigate(action.screen) ?? navigation.navigate(action.screen)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: action.color + '15' }]}>
                            <MaterialCommunityIcons name={action.icon} size={28} color={action.color} />
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Button
                title="Sign Out"
                onPress={logout}
                variant="outlined"
                style={{ marginTop: theme.spacing[4] }}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing[4],
        paddingBottom: theme.spacing[6],
    },
    greeting: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    userName: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    actionCard: {
        width: '47%',
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[4],
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing[3],
    },
    actionLabel: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textPrimary,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing[3],
        backgroundColor: theme.roles.light.infoBg,
        borderLeftWidth: 3,
        borderLeftColor: theme.roles.light.infoBorder,
    },
    infoText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.infoText,
        flex: 1,
        lineHeight: 18,
    },
    loadingContainer: {
        paddingVertical: theme.spacing[8],
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    statCard: {
        width: '47%',
        padding: theme.spacing[4],
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[2],
        marginBottom: 4,
    },
    statLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
});
