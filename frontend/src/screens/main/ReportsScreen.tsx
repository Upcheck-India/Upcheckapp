import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { reportsApi, DashboardSummary } from '../../api/reports';
import { farmsApi, Farm } from '../../api/farms';

interface FinancialReport {
    revenue: number;
    totalExpenses: number;
    profit: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
}

interface CycleAnalysis {
    cycleId: string;
    fcr: number;
    survivalRate: number;
    growthChart: Array<{ date: string; mbw: number }>;
}

export const ReportsScreen = ({ navigation }: any) => {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFarmPicker, setShowFarmPicker] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch farms first
            const { data: farmsData } = await farmsApi.getAll();
            setFarms(farmsData);

            // If farms exist, select first farm or use existing selection
            const farmId = selectedFarmId || (farmsData.length > 0 ? farmsData[0].id : null);
            setSelectedFarmId(farmId);

            if (farmId) {
                // Fetch dashboard summary and financial report
                const [summaryRes, financialRes] = await Promise.all([
                    reportsApi.getDashboardSummary(farmId),
                    reportsApi.getFinancialReport(farmId),
                ]);
                setSummary(summaryRes.data);
                setFinancialReport(financialRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch reports data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const selectedFarm = farms.find(f => f.id === selectedFarmId);

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    if (isLoading) {
        return (
            <ScreenWrapper>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                    <Text style={styles.loadingText}>Loading reports...</Text>
                </View>
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
                            onPress={() => {
                                setSelectedFarmId(farm.id);
                                setShowFarmPicker(false);
                                setIsLoading(true);
                                fetchData();
                            }}
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

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
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
                        {/* Dashboard Summary */}
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

                        {/* Financial Report */}
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

                        {/* Expenses Breakdown */}
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

                        {/* Quick Actions */}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[2],
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
});