import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { Button } from '../../components/ui/Button';
import { Skeleton, SkeletonGrid, SkeletonMetric } from '../../components/ui/Skeleton';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { theme } from '../../theme';
import { reportsApi, DashboardSummary } from '../../api/reports';
import { farmsApi, Farm } from '../../api/farms';

interface FinancialReport {
    revenue: number;
    totalExpenses: number;
    profit: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
}

export const ReportsScreen = ({ navigation }: any) => {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [showFarmPicker, setShowFarmPicker] = useState(false);

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

    const fetchData = useCallback(async (forceRefresh = false) => {
        setError(null);
        setIsOffline(false);

        try {
            const { data: farmsData } = await farmsApi.getAll();
            setFarms(farmsData);

            const farmId = selectedFarmId || (farmsData.length > 0 ? farmsData[0].id : null);
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
        // Fetch new data for selected farm
        setTimeout(() => fetchData(true), 100);
    }, [fetchData, fadeAnim]);

    const selectedFarm = farms.find(f => f.id === selectedFarmId);

    const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

    const renderSkeleton = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <SkeletonGrid count={4} columns={2} />
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing[6] }]}>Financial Summary</Text>
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
                    <Text style={styles.headerTitle}>Reports</Text>
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
                    <Text style={styles.headerTitle}>Reports</Text>
                </View>
                <NetworkError onRetry={handleRetry} />
            </ScreenWrapper>
        );
    }

    if (error && farms.length === 0) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Reports</Text>
                </View>
                <ErrorState
                    title="Couldn't Load Reports"
                    error={error}
                    onRetry={handleRetry}
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Reports</Text>
                <TouchableOpacity
                    onPress={() => setShowFarmPicker(!showFarmPicker)}
                    style={styles.farmSelector}
                >
                    <MaterialCommunityIcons name="barn" size={20} color={theme.roles.light.primary} />
                    <Text style={styles.farmSelectorText}>
                        {selectedFarm?.name || 'Select Farm'}
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
                            <Text style={styles.emptyTitle}>No Farms Yet</Text>
                            <Text style={styles.emptySubtitle}>Create a farm to see reports</Text>
                            <Button
                                title="Create Farm"
                                onPress={() => navigation.navigate('CreateFarm')}
                                style={styles.emptyButton}
                            />
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>Overview</Text>
                            <View style={styles.summaryGrid}>
                                <MetricCard
                                    label="Active Ponds"
                                    value={summary?.activePondsCount?.toString() || '0'}
                                    icon="water"
                                />
                                <MetricCard
                                    label="Total Ponds"
                                    value={summary?.totalPondsCount?.toString() || '0'}
                                    icon="water-outline"
                                />
                                <MetricCard
                                    label="Low Stock"
                                    value={(summary?.lowStockAlerts || 0).toString()}
                                    icon="alert"
                                    status={(summary?.lowStockAlerts || 0) > 0 ? 'warning' : 'normal'}
                                />
                                <MetricCard
                                    label="Today's Feed"
                                    value={summary?.todayFeedUsage?.toString() || '0'}
                                    unit="kg"
                                    icon="corn"
                                />
                            </View>

                            <Text style={styles.sectionTitle}>Financial Summary</Text>
                            <Card style={styles.financialCard}>
                                <View style={styles.financialRow}>
                                    <View style={styles.financialItem}>
                                        <Text style={styles.financialLabel}>Total Revenue</Text>
                                        <Text style={[styles.financialValue, styles.revenue]}>
                                            {formatCurrency(financialReport?.revenue || 0)}
                                        </Text>
                                    </View>
                                    <View style={styles.financialDivider} />
                                    <View style={styles.financialItem}>
                                        <Text style={styles.financialLabel}>Total Expenses</Text>
                                        <Text style={[styles.financialValue, styles.expense]}>
                                            {formatCurrency(financialReport?.totalExpenses || 0)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.profitRow}>
                                    <Text style={styles.profitLabel}>Net Profit</Text>
                                    <Text style={[
                                        styles.profitValue,
                                        (financialReport?.profit || 0) >= 0 ? styles.profitPositive : styles.profitNegative,
                                    ]}>
                                        {formatCurrency(financialReport?.profit || 0)}
                                    </Text>
                                </View>
                            </Card>

                            {(financialReport?.expensesByCategory?.length ?? 0) > 0 && (
                                <Card style={styles.expensesCard}>
                                    <Text style={styles.cardTitle}>Expenses Breakdown</Text>
                                    {financialReport?.expensesByCategory?.map((item, index) => (
                                        <View key={item.category + index} style={styles.expenseRow}>
                                            <Text style={styles.expenseCategory}>{item.category}</Text>
                                            <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
                                        </View>
                                    ))}
                                </Card>
                            )}

                            <Text style={styles.sectionTitle}>Quick Actions</Text>
                            <View style={styles.actionsGrid}>
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() => navigation.navigate('CalculatorHub')}
                                >
                                    <MaterialCommunityIcons name="calculator-variant" size={32} color={theme.roles.light.primary} />
                                    <Text style={styles.actionLabel}>Calculators</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() => navigation.navigate('SimulationList')}
                                >
                                    <MaterialCommunityIcons name="chart-timeline-variant" size={32} color={theme.roles.light.successText} />
                                    <Text style={styles.actionLabel}>Simulations</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() => navigation.navigate('Farms')}
                                >
                                    <MaterialCommunityIcons name="barn" size={32} color={theme.roles.light.infoBorder} />
                                    <Text style={styles.actionLabel}>Farms</Text>
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