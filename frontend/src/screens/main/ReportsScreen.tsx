import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { Button } from '../../components/ui/Button';
import { Skeleton, SkeletonGrid, SkeletonMetric } from '../../components/ui/Skeleton';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { theme } from '../../theme';
import { BarChart } from '../../components/charts/BarChart';
import { reportsApi, DashboardSummary } from '../../api/reports';
import { farmsApi, Farm } from '../../api/farms';
import { useMembershipStore } from '../../store/membershipStore';
import { usePermissions } from '../../hooks/usePermissions';

interface FinancialReport {
    revenue: number;
    totalExpenses: number;
    profit: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
}

export const ReportsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [showFarmPicker, setShowFarmPicker] = useState(false);

    // Economics (transactions) are owner-only; default to owner when membership
    // isn't loaded yet — the backend enforces the real gate regardless.
    const loadMemberships = useMembershipStore((s) => s.load);
    const perms = usePermissions(selectedFarmId ?? undefined);
    useEffect(() => { loadMemberships(); }, [loadMemberships]);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Cache ref
    const cacheRef = useRef<Map<string, { summary: DashboardSummary; financial: FinancialReport; timestamp: number }>>(new Map());
    const CACHE_TTL = 60000; // 1 minute for reports

    const fadeIn = useCallback(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const fetchData = useCallback(async (forceRefresh = false, farmIdOverride?: string) => {
        setError(null);
        setIsOffline(false);

        try {
            const { data: farmsData } = await farmsApi.getAll();
            setFarms(farmsData);

            const farmId = farmIdOverride || selectedFarmId || (farmsData.length > 0 ? farmsData[0].id : null);
            if (farmId && !selectedFarmId) {
                setSelectedFarmId(farmId);
            }

            if (farmId) {
                // Check cache
                if (!forceRefresh && cacheRef.current.has(farmId)) {
                    const cached = cacheRef.current.get(farmId)!;
                    if (Date.now() - cached.timestamp < CACHE_TTL) {
                        setSummary(cached.summary);
                        setFinancialReport(cached.financial);
                        setIsLoading(false);
                        fadeIn();
                        return;
                    }
                }

                const [summaryRes, financialRes] = await Promise.all([
                    reportsApi.getDashboardSummary(farmId),
                    reportsApi.getFinancialReport(farmId),
                ]);
                setSummary(summaryRes.data);
                setFinancialReport(financialRes.data);
                cacheRef.current.set(farmId, {
                    summary: summaryRes.data,
                    financial: financialRes.data,
                    timestamp: Date.now(),
                });
                fadeIn();
            }
        } catch (err: any) {
            const statusCode = err?.response?.status;
            if (statusCode === 0 || err?.code === 'NETWORK_ERROR' || !err?.response) {
                setIsOffline(true);
            }
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedFarmId, fadeIn]);

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchData(true);
    }, [fetchData]);

    const handleFarmSelect = useCallback((farmId: string) => {
        setSelectedFarmId(farmId);
        setShowFarmPicker(false);
        setIsLoading(true);
        fadeAnim.setValue(0);
        // Fetch new data for the newly-selected farm — pass it explicitly so we
        // don't read the stale `selectedFarmId` still captured in this closure.
        fetchData(true, farmId);
    }, [fetchData, fadeAnim]);

    const selectedFarm = farms.find(f => f.id === selectedFarmId);

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

    const renderSkeleton = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>{t('home.reportsOverview')}</Text>
            <SkeletonGrid count={4} columns={2} />
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing[6] }]}>{t('home.reportsFinancialSummary')}</Text>
            <Card style={styles.financialCard}>
                <View style={styles.financialRow}>
                    <View style={styles.financialItem}>
                        <Skeleton width="60%" height={12} style={styles.mb2} />
                        <Skeleton width="80%" height={24} />
                    </View>
                    <View style={styles.financialDivider} />
                    <View style={styles.financialItem}>
                        <Skeleton width="60%" height={12} style={styles.mb2} />
                        <Skeleton width="80%" height={24} />
                    </View>
                </View>
            </Card>
        </View>
    );

    if (isLoading) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('home.reportsTitle')}</Text>
                    <View style={styles.farmSelector}>
                        <MaterialCommunityIcons name="barn" size={20} color={theme.roles.light.textSecondary} />
                        <Skeleton width={80} height={16} />
                    </View>
                </View>
                {renderSkeleton()}
            </ScreenWrapper>
        );
    }

    if (isOffline) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('home.reportsTitle')}</Text>
                </View>
                <NetworkError onRetry={handleRetry} />
            </ScreenWrapper>
        );
    }

    if (error && farms.length === 0) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('home.reportsTitle')}</Text>
                </View>
                <ErrorState
                    title={t('home.reportsErrorTitle')}
                    error={error}
                    onRetry={handleRetry}
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('home.reportsTitle')}</Text>
                <TouchableOpacity
                    onPress={() => setShowFarmPicker(!showFarmPicker)}
                    style={styles.farmSelector}
                >
                    <MaterialCommunityIcons name="barn" size={20} color={theme.roles.light.primary} />
                    <Text style={styles.farmSelectorText}>
                        {selectedFarm?.name || t('home.reportsSelectFarm')}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={theme.roles.light.textSecondary} />
                </TouchableOpacity>
            </View>

            {showFarmPicker && (
                <View style={styles.farmPicker}>
                    {farms.map(farm => (
                        <TouchableOpacity
                            key={farm.id}
                            style={[
                                styles.farmPickerItem,
                                farm.id === selectedFarmId && styles.farmPickerItemSelected,
                            ]}
                            onPress={() => handleFarmSelect(farm.id)}
                        >
                            <Text style={[
                                styles.farmPickerItemText,
                                farm.id === selectedFarmId && styles.farmPickerItemTextSelected,
                            ]}>
                                {farm.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.roles.light.primary]} />}
                >
                    {farms.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="barn" size={64} color={theme.roles.light.textDisabled} />
                            <Text style={styles.emptyTitle}>{t('home.reportsNoFarmsTitle')}</Text>
                            <Text style={styles.emptySubtitle}>{t('home.reportsNoFarmsSubtitle')}</Text>
                            <Button
                                title={t('home.reportsCreateFarm')}
                                onPress={() => navigation.navigate('CreateFarm')}
                                style={styles.emptyButton}
                            />
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>{t('home.reportsOverview')}</Text>
                            <View style={styles.summaryGrid}>
                                <MetricCard
                                    label={t('home.reportsActivePonds')}
                                    value={summary?.activePondsCount?.toString() || '0'}
                                    icon="water"
                                />
                                <MetricCard
                                    label={t('home.reportsTotalPonds')}
                                    value={summary?.totalPondsCount?.toString() || '0'}
                                    icon="water-outline"
                                />
                                <MetricCard
                                    label={t('home.reportsLowStock')}
                                    value={(summary?.lowStockAlerts || 0).toString()}
                                    icon="alert"
                                    status={(summary?.lowStockAlerts || 0) > 0 ? 'warning' : 'normal'}
                                />
                                <MetricCard
                                    label={t('home.reportsTodayFeed')}
                                    value={summary?.todayFeedUsage?.toString() || '0'}
                                    unit="kg"
                                    icon="corn"
                                />
                            </View>

                            <Text style={styles.sectionTitle}>{t('home.reportsFinancialSummary')}</Text>
                            <Card style={styles.financialCard}>
                                <View style={styles.financialRow}>
                                    <View style={styles.financialItem}>
                                        <Text style={styles.financialLabel}>{t('home.reportsTotalRevenue')}</Text>
                                        <Text style={[styles.financialValue, styles.revenue]}>
                                            {formatCurrency(financialReport?.revenue || 0)}
                                        </Text>
                                    </View>
                                    <View style={styles.financialDivider} />
                                    <View style={styles.financialItem}>
                                        <Text style={styles.financialLabel}>{t('home.reportsTotalExpenses')}</Text>
                                        <Text style={[styles.financialValue, styles.expense]}>
                                            {formatCurrency(financialReport?.totalExpenses || 0)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.profitRow}>
                                    <Text style={styles.profitLabel}>{t('home.reportsNetProfit')}</Text>
                                    <Text style={[
                                        styles.profitValue,
                                        (financialReport?.profit || 0) >= 0 ? styles.profitPositive : styles.profitNegative,
                                    ]}>
                                        {formatCurrency(financialReport?.profit || 0)}
                                    </Text>
                                </View>
                            </Card>

                            {perms.canViewFinancials && selectedFarmId && (
                                <TouchableOpacity
                                    style={styles.drillRow}
                                    onPress={() => navigation.navigate('Transactions', { farmId: selectedFarmId, farmName: selectedFarm?.name })}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                >
                                    <MaterialCommunityIcons name="swap-horizontal" size={20} color={theme.roles.light.primary} />
                                    <Text style={styles.drillText}>{t('home.reportsViewTransactions')}</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textSecondary} />
                                </TouchableOpacity>
                            )}

                            {(financialReport?.expensesByCategory?.length ?? 0) > 0 && (
                                <Card style={styles.expensesCard}>
                                    <Text style={styles.cardTitle}>{t('home.reportsExpensesBreakdown')}</Text>
                                    <BarChart
                                        data={{
                                            labels: financialReport!.expensesByCategory.map(item =>
                                                item.category.length > 8
                                                    ? item.category.slice(0, 7) + '…'
                                                    : item.category
                                            ),
                                            datasets: [{ data: financialReport!.expensesByCategory.map(item => item.amount) }],
                                        }}
                                        yAxisLabel="₹"
                                        yAxisSuffix=""
                                    />
                                    {financialReport?.expensesByCategory?.map((item, index) => (
                                        <View key={item.category + index} style={styles.expenseRow}>
                                            <Text style={styles.expenseCategory}>{item.category}</Text>
                                            <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
                                        </View>
                                    ))}
                                </Card>
                            )}

                            <Text style={styles.sectionTitle}>{t('home.reportsQuickActions')}</Text>
                            <View style={styles.actionsGrid}>
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() => navigation.navigate('CalculatorHub')}
                                >
                                    <MaterialCommunityIcons name="calculator-variant" size={32} color={theme.roles.light.primary} />
                                    <Text style={styles.actionLabel}>{t('home.reportsCalculators')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() => navigation.navigate('SimulationList')}
                                >
                                    <MaterialCommunityIcons name="chart-timeline-variant" size={32} color={theme.roles.light.successText} />
                                    <Text style={styles.actionLabel}>{t('home.reportsSimulations')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() => navigation.navigate('Farms')}
                                >
                                    <MaterialCommunityIcons name="barn" size={32} color={theme.roles.light.infoBorder} />
                                    <Text style={styles.actionLabel}>{t('home.reportsFarms')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>
            </Animated.View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    farmSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        padding: theme.spacing[2],
        borderRadius: theme.radius.sm,
        backgroundColor: theme.roles.light.surfaceVariant,
    },
    farmSelectorText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
    },
    farmPicker: {
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    farmPickerItem: {
        padding: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    farmPickerItemSelected: {
        backgroundColor: theme.roles.light.primary + '10',
    },
    farmPickerItemText: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
    },
    farmPickerItemTextSelected: {
        color: theme.roles.light.primary,
        fontWeight: '600',
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing[8],
    },
    emptyTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[4],
    },
    emptySubtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[6],
    },
    emptyButton: {
        marginTop: theme.spacing[4],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[6],
    },
    financialCard: {
        marginBottom: theme.spacing[4],
        padding: theme.spacing[4],
    },
    drillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    drillText: {
        flex: 1,
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
    },
    financialRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing[4],
    },
    financialItem: {
        flex: 1,
        alignItems: 'center',
    },
    financialDivider: {
        width: 1,
        backgroundColor: theme.roles.light.borderDefault,
        marginHorizontal: theme.spacing[4],
    },
    financialLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[2],
    },
    financialValue: {
        ...theme.typeScale.h3,
    },
    revenue: {
        color: theme.roles.light.successText,
    },
    expense: {
        color: theme.roles.light.dangerText,
    },
    profitRow: {
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.borderDefault,
        paddingTop: theme.spacing[4],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profitLabel: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
    },
    profitValue: {
        ...theme.typeScale.h2,
    },
    profitPositive: {
        color: theme.roles.light.successText,
    },
    profitNegative: {
        color: theme.roles.light.dangerText,
    },
    expensesCard: {
        marginBottom: theme.spacing[6],
        padding: theme.spacing[4],
    },
    cardTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    expenseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[2],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    expenseCategory: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
    },
    expenseAmount: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    actionCard: {
        flex: 1,
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing[4],
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    actionLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[2],
    },
    mb2: {
        marginBottom: theme.spacing[2],
    },
});