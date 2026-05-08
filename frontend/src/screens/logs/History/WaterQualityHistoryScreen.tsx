import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { theme } from '../../../theme';
import { waterQualityApi, WaterQualityRecord } from '../../../api/waterQuality';
import { getParameterStatus, getStatusColor } from '../../../constants/ranges';

export const WaterQualityHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, pondName, cropId } = route.params;
    const [records, setRecords] = useState<WaterQualityRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchRecords = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);
        setError(null);

        try {
            const response = await waterQualityApi.getAll(pondId);
            const result = response.data;
            const pondRecords: WaterQualityRecord[] = Array.isArray(result) ? result : (result as any).data || [];
            pondRecords.sort((a, b) => new Date(b.recordedAt || '').getTime() - new Date(a.recordedAt || '').getTime());
            setRecords(pondRecords);
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [pondId]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchRecords(true);
    }, [fetchRecords]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchRecords(true);
    }, [fetchRecords]);

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
                        <Text style={styles.metricVal}>{item.ph ?? '--'}</Text>
                        {item.ph && <View style={[styles.dot, { backgroundColor: getStatusColor(getParameterStatus('ph', item.ph)) }]} />}
                    </View>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>DO (mg/L)</Text>
                    <View style={styles.valRow}>
                        <Text style={styles.metricVal}>{item.dissolvedOxygen ?? '--'}</Text>
                        {item.dissolvedOxygen && <View style={[styles.dot, { backgroundColor: getStatusColor(getParameterStatus('do', item.dissolvedOxygen)) }]} />}
                    </View>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Temp (°C)</Text>
                    <View style={styles.valRow}>
                        <Text style={styles.metricVal}>{item.temperature ?? '--'}</Text>
                        {item.temperature && <View style={[styles.dot, { backgroundColor: getStatusColor(getParameterStatus('temperature', item.temperature)) }]} />}
                    </View>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Salinity</Text>
                    <View style={styles.valRow}>
                        <Text style={styles.metricVal}>{item.salinity ?? '--'}</Text>
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

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
            ) : error && records.length === 0 ? (
                <ErrorState title="Couldn't Load Records" error={error} onRetry={handleRetry} />
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.roles.light.primary]} tintColor={theme.roles.light.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="water-outline" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>No Water Quality Logs</Text>
                            <Text style={styles.emptyText}>Start recording water quality to see trends.</Text>
                        </View>
                    }
                />
            )}

            <FAB icon="plus" onPress={() => navigation.navigate('WaterQualityLog', { pondId, pondName, cropId })} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { marginBottom: theme.spacing[3], padding: theme.spacing[4] },
    cardHeader: { marginBottom: theme.spacing[3], borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault, paddingBottom: theme.spacing[2] },
    dateText: { ...theme.typeScale.labelMedium, color: theme.roles.light.primary },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    metricItem: { width: '48%', marginBottom: theme.spacing[3] },
    metricLabel: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    valRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
    metricVal: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
