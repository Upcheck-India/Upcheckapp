import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { LineChart } from '../../../components/charts/LineChart';
import { theme } from '../../../theme';
import { waterQualityApi, WaterQualityRecord } from '../../../api/waterQuality';
import { getParameterStatus, getStatusColor, getStatusIcon } from '../../../constants/ranges';

export const WaterQualityHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;
    const [records, setRecords] = useState<WaterQualityRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');
    const [chartMetric, setChartMetric] = useState<'ph' | 'dissolvedOxygen' | 'temperature'>('ph');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            // In a real app we'd filter by pondId here
            const response = await waterQualityApi.getAll(pondId);
            const result = response.data;
            // Backend returns PageDto { data: [...], meta: {...} }
            const pondRecords: WaterQualityRecord[] = Array.isArray(result) ? result : (result as any).data || [];

            // Sort newest first
            pondRecords.sort((a, b) => new Date(b.recordedAt || '').getTime() - new Date(a.recordedAt || '').getTime());
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
                const d = new Date(r.recordedAt || '');
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
                    {new Date(item.recordedAt || '').toLocaleDateString()} at {new Date(item.recordedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        <Text style={styles.metricVal}>{item.dissolvedOxygen || '--'}</Text>
                        {item.dissolvedOxygen && <View style={[styles.dot, { backgroundColor: getStatusColor(getParameterStatus('do', item.dissolvedOxygen)) }]} />}
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
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Water Quality History</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'list' && styles.activeTab]}
                    onPress={() => setActiveTab('list')}
                >
                    <MaterialCommunityIcons name="format-list-bulleted" size={20} color={activeTab === 'list' ? theme.roles.light.primary : theme.roles.light.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>List View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chart' && styles.activeTab]}
                    onPress={() => setActiveTab('chart')}
                >
                    <MaterialCommunityIcons name="chart-line" size={20} color={activeTab === 'chart' ? theme.roles.light.primary : theme.roles.light.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'chart' && styles.activeTabText]}>Chart View</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
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
                        <TouchableOpacity onPress={() => setChartMetric('dissolvedOxygen')} style={[styles.pill, chartMetric === 'dissolvedOxygen' && styles.activePill]}>
                            <Text style={[styles.pillText, chartMetric === 'dissolvedOxygen' && styles.activePillText]}>DO</Text>
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
        paddingVertical: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing[4],
        gap: theme.spacing[3],
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.roles.light.primary,
    },
    tabText: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textSecondary,
    },
    activeTabText: {
        color: theme.roles.light.primary,
        fontWeight: '700',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing[4] },
    card: {
        marginBottom: theme.spacing[3],
        padding: theme.spacing[4],
    },
    cardHeader: {
        marginBottom: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        paddingBottom: theme.spacing[2],
    },
    dateText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.primary,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricItem: {
        width: '48%',
        marginBottom: theme.spacing[3],
    },
    metricLabel: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
    valRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
    },
    metricVal: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyState: { padding: theme.spacing[8], alignItems: 'center' },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    chartContainer: {
        flex: 1,
        padding: theme.spacing[4],
        alignItems: 'center',
    },
    metricSelectors: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[6],
    },
    pill: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        borderRadius: theme.radius.full,
        backgroundColor: theme.roles.light.borderDefault,
    },
    activePill: {
        backgroundColor: theme.roles.light.primary,
    },
    pillText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    activePillText: {
        color: theme.roles.light.surface,
    },
});
