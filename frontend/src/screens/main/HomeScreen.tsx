import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { MoonPhaseCard } from '../../components/ui/MoonPhaseCard';
import { FarmGlanceCards } from '../../components/dashboard/FarmGlanceCards';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useActiveFarmStore } from '../../store/activeFarmStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportsApi, DashboardSummary } from '../../api/reports';
import { farmsApi } from '../../api/farms';
import { pondsApi, type Pond } from '../../api/ponds';
import { ONBOARDING_FLAG } from '../onboarding/WelcomeScreen';

export const HomeScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { selectedFarm, setSelectedFarm } = useActiveFarmStore();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [ponds, setPonds] = useState<Pond[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                // The dashboard aggregates per-farm; without a farmId the backend
                // returns all-zeros. Use the selected farm, else default to the
                // user's first farm (and remember it as the active farm).
                let farmId = selectedFarm?.id;
                if (!farmId) {
                    const { data: farms } = await farmsApi.getAll();
                    const first = Array.isArray(farms) ? farms[0] : undefined;
                    if (first) {
                        farmId = first.id;
                        setSelectedFarm({ id: first.id, name: first.name, location: (first as any).location });
                    }
                }
                const { data } = await reportsApi.getDashboardSummary(farmId);
                setSummary(data);
            } catch (error) {
                console.error("Failed to fetch dashboard summary", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, [selectedFarm?.id]);

    // Ponds for the one-tap "Your Ponds" shortcut — so the farmer reaches a pond
    // (and its daily loop) without drilling Farms → Farm → Pond.
    useEffect(() => {
        pondsApi.getMine().then(({ data }) => setPonds(data)).catch(() => setPonds([]));
    }, []);

    // First-run: a brand-new farmer with no farms and who hasn't seen the welcome
    // gets a one-time guided intro. The flag is set inside WelcomeScreen.
    useEffect(() => {
        (async () => {
            try {
                if (await AsyncStorage.getItem(ONBOARDING_FLAG)) return;
                const { data: farms } = await farmsApi.getAll();
                if (Array.isArray(farms) && farms.length === 0) {
                    (navigation.getParent() ?? navigation).navigate('Welcome');
                }
            } catch {
                /* non-blocking; onboarding is a nicety, never a gate */
            }
        })();
    }, []);

    // Root-stack screens (CreateFarm, PondDashboard, Settings…) live above the
    // tab navigator; navigate via the parent so they resolve from a tab.
    const goRoot = (screen: string, params?: any) =>
        navigation.getParent()?.navigate(screen, params) ?? navigation.navigate(screen, params);

    const quickActions = [
        { icon: 'barn' as const, label: t('home.actionFarms'), screen: 'Farms', isTab: true, color: theme.roles.light.primary },
        { icon: 'calculator-variant-outline' as const, label: t('home.actionCalculators'), screen: 'CalculatorHub', isTab: false, color: theme.roles.light.infoBorder },
        { icon: 'chart-timeline-variant' as const, label: t('home.actionSimulate'), screen: 'SimulationList', isTab: false, color: theme.roles.light.successText },
        { icon: 'cog-outline' as const, label: t('home.actionSettings'), screen: 'Settings', isTab: false, color: theme.roles.light.warningText },
    ];

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{t('home.greeting')}</Text>
                    <Text style={styles.userName}>
                        {user?.name || user?.email?.split('@')[0] || t('home.farmerFallback')}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Settings') ?? navigation.navigate('Settings')} style={styles.avatar}>
                    <MaterialCommunityIcons name="account-circle" size={40} color={theme.roles.light.primary} />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t('home.dashboardSummary')}</Text>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                </View>
            ) : summary ? (
                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="water" size={32} color={theme.roles.light.primary} />
                        <Text style={styles.statValue}>{summary.activePondsCount}</Text>
                        <Text style={styles.statLabel}>{t('home.activePonds')}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="water-outline" size={32} color={theme.roles.light.textSecondary} />
                        <Text style={styles.statValue}>{summary.totalPondsCount}</Text>
                        <Text style={styles.statLabel}>{t('home.totalPonds')}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="alert" size={32} color={theme.roles.light.dangerText} />
                        <Text style={styles.statValue}>{summary.lowStockAlerts}</Text>
                        <Text style={styles.statLabel}>{t('home.lowStockAlerts')}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="corn" size={32} color={theme.roles.light.warningText} />
                        <Text style={styles.statValue}>{summary.todayFeedUsage}</Text>
                        <Text style={styles.statLabel}>{t('home.todayFeed')}</Text>
                    </Card>
                </View>
            ) : (
                <Card style={styles.ctaCard}>
                    <View style={styles.ctaIcon}>
                        <MaterialCommunityIcons name="barn" size={28} color={theme.roles.light.primary} />
                    </View>
                    <Text style={styles.ctaText}>{t('home.noFarmData')}</Text>
                    <Button
                        title={t('home.quickLogCreateFarm')}
                        onPress={() => goRoot('CreateFarm')}
                        style={styles.ctaBtn}
                    />
                </Card>
            )}

            {/* Your Ponds — one tap from the dashboard into any pond's daily loop. */}
            {ponds.length > 0 && (
                <>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>{t('home.yourPonds')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Farms')}>
                            <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pondRow}>
                        {ponds.slice(0, 8).map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                activeOpacity={0.85}
                                onPress={() => goRoot('PondDashboard', { pondId: p.id, pondName: p.displayName || p.name })}
                            >
                                <Card style={styles.pondCard}>
                                    <MaterialCommunityIcons name="water" size={22} color={theme.roles.light.primary} />
                                    <Text style={styles.pondName} numberOfLines={1}>{p.displayName || p.name}</Text>
                                    <Text style={styles.pondMeta} numberOfLines={1}>
                                        {p.activeCycleId ? t('home.pondActive') : t('home.pondIdle')}
                                    </Text>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}

            <Text style={styles.sectionTitle}>{t('home.lunarCycle')}</Text>
            <View style={styles.moonSection}>
                <MoonPhaseCard />
            </View>

            {/* Farm-at-a-glance: last water quality, last feed, expenses, P&L. */}
            {selectedFarm?.id && (
                <>
                    <Text style={styles.sectionTitle}>{t('home.farmGlance')}</Text>
                    <FarmGlanceCards farmId={selectedFarm.id} farmName={selectedFarm.name} navigation={navigation} />
                </>
            )}

            <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
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
    moonSection: {
        marginBottom: theme.spacing[6],
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
    ctaCard: {
        alignItems: 'center',
        padding: theme.spacing[5],
        marginBottom: theme.spacing[6],
        gap: theme.spacing[2],
    },
    ctaIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: theme.roles.light.primary + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    ctaText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    ctaBtn: { alignSelf: 'stretch', marginTop: theme.spacing[2] },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[4],
    },
    viewAll: { ...theme.typeScale.labelMedium, color: theme.roles.light.primary },
    pondRow: { gap: theme.spacing[3], paddingBottom: theme.spacing[2], marginBottom: theme.spacing[6] },
    pondCard: { width: 130, padding: theme.spacing[4], gap: theme.spacing[1] },
    pondName: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, fontWeight: '600', marginTop: theme.spacing[1] },
    pondMeta: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary },
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
