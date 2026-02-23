import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { LineChart } from '../../../components/charts/LineChart';
import { Colors, typography, spacing, radius } from '../../../theme';
import { waterQualityApi, WaterQualityRecord } from '../../../api/waterQuality';
import { getParameterStatus, getStatusColor, getStatusIcon } from '../../../constants/ranges';

export const WaterQualityHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;
    const [records, setRecords] = useState<WaterQualityRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');
    const [chartMetric, setChartMetric] = useState<'ph' | 'do' | 'temperature'>('ph');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            // In a real app we'd filter by pondId here
            const { data } = await waterQualityApi.getAll(pondId);
            const pondRecords = data;

            // Sort newest first
            pondRecords.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
            setRecords(pondRecords);
        } catch (error) {
            console.log('Failed to fetch WQ records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getChartData = () => {
        // Sort oldest to newest for charts (left to right time series)
        const chartRecords = [...records].reverse().slice(-7); // Last 7 readings

        if (chartRecords.length === 0) return null;

        return {
            labels: chartRecords.map(r => {
                const d = new Date(r.recordedAt);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: [
                {
                    data: chartRecords.map(r => r[chartMetric] || 0)
                }
            ]
        };
    };

    const renderItem = ({ item }: { item: WaterQualityRecord }) => (
        <Card style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.dateText}>
                    {new Date(item.recordedAt).toLocaleDateString()} at {new Date(item.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>pH</Text>
                    <View style={styles.valRow}>
                        <Text style={styles.metricVal}>{item.ph || '--'}</Text>
                        {item.ph && <View style={[styles.dot, { backgroundColor: getStatusColor(getParameterStatus('ph', item.ph)) }]} />}
                    </View>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>DO (mg/L)</Text>
                    <View style={styles.valRow}>
                        <Text style={styles.metricVal}>{item.do || '--'}</Text>
                        {item.do && <View style={[styles.dot, { backgroundColor: getStatusColor(getParameterStatus('do', item.do)) }]} />}
                    </View>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Temp (°C)</Text>
                    <View style={styles.valRow}>
                        <Text style={styles.metricVal}>{item.temperature || '--'}</Text>
                        {item.temperature && <View style={[styles.dot, { backgroundColor: getStatusColor(getParameterStatus('temperature', item.temperature)) }]} />}
                    </View>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Salinity</Text>
                    <View style={styles.valRow}>
                        <Text style={styles.metricVal}>{item.salinity || '--'}</Text>
                    </View>
                </View>
            </View>
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Water Quality History</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'list' && styles.activeTab]}
                    onPress={() => setActiveTab('list')}
                >
                    <MaterialCommunityIcons name="format-list-bulleted" size={20} color={activeTab === 'list' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>List View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chart' && styles.activeTab]}
                    onPress={() => setActiveTab('chart')}
                >
                    <MaterialCommunityIcons name="chart-line" size={20} color={activeTab === 'chart' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'chart' && styles.activeTabText]}>Chart View</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : activeTab === 'list' ? (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No reading data available.</Text>
                        </View>
                    }
                />
            ) : (
                <View style={styles.chartContainer}>
                    <View style={styles.metricSelectors}>
                        <TouchableOpacity onPress={() => setChartMetric('ph')} style={[styles.pill, chartMetric === 'ph' && styles.activePill]}>
                            <Text style={[styles.pillText, chartMetric === 'ph' && styles.activePillText]}>pH</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setChartMetric('do')} style={[styles.pill, chartMetric === 'do' && styles.activePill]}>
                            <Text style={[styles.pillText, chartMetric === 'do' && styles.activePillText]}>DO</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setChartMetric('temperature')} style={[styles.pill, chartMetric === 'temperature' && styles.activePill]}>
                            <Text style={[styles.pillText, chartMetric === 'temperature' && styles.activePillText]}>Temp</Text>
                        </TouchableOpacity>
                    </View>

                    {records.length > 0 ? (
                        <LineChart
                            data={getChartData()!}
                            yAxisSuffix={chartMetric === 'temperature' ? '°' : ''}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Not enough data to display chart.</Text>
                        </View>
                    )}
                </View>
            )}
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
    },
    backBtn: { padding: spacing.md },
    title: { ...typography.h3, color: Colors.textPrimary },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.surface,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        ...typography.labelLarge,
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.primary,
        fontWeight: '700',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.md },
    card: {
        marginBottom: spacing.sm,
        padding: spacing.md,
    },
    cardHeader: {
        marginBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        paddingBottom: spacing.xs,
    },
    dateText: {
        ...typography.labelMedium,
        color: Colors.primary,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricItem: {
        width: '48%',
        marginBottom: spacing.sm,
    },
    metricLabel: {
        ...typography.bodySmall,
        color: Colors.textSecondary,
    },
    valRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    metricVal: {
        ...typography.bodyLarge,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyState: { padding: spacing.xl, alignItems: 'center' },
    emptyText: { ...typography.bodyMedium, color: Colors.textSecondary },
    chartContainer: {
        flex: 1,
        padding: spacing.md,
        alignItems: 'center',
    },
    metricSelectors: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: Colors.border,
    },
    activePill: {
        backgroundColor: Colors.primary,
    },
    pillText: {
        ...typography.labelMedium,
        color: Colors.textSecondary,
    },
    activePillText: {
        color: Colors.surface,
    },
});
