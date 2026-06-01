import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { theme } from '../../../theme';
import { samplingApi, SamplingRecord } from '../../../api/sampling';

export const SamplingHistoryScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName, cropId } = route.params;
    const [records, setRecords] = useState<SamplingRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchRecords = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);
        setError(null);

        try {
            const { data } = cropId
                ? await samplingApi.getByCrop(cropId)
                : await samplingApi.getAll();
            const result: SamplingRecord[] = Array.isArray(data) ? data : [];
            const filtered = cropId ? result : result.filter((r) => r.pondId === pondId);
            filtered.sort((a, b) => new Date(b.samplingDate).getTime() - new Date(a.samplingDate).getTime());
            setRecords(filtered);
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [pondId, cropId]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchRecords(true);
    }, [fetchRecords]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchRecords(true);
    }, [fetchRecords]);

    const handleDelete = useCallback((item: SamplingRecord) => {
        Alert.alert(
            t('common.delete') + ' ' + t('common.date'),
            t('history.samplingDeleteMsg', { date: new Date(item.samplingDate).toLocaleDateString() }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await samplingApi.remove(item.id);
                            setRecords((prev) => prev.filter((r) => r.id !== item.id));
                        } catch (err) {
                            Alert.alert(t('common.error'), t('history.samplingDeleteError'));
                        }
                    },
                },
            ],
        );
    }, []);

    const renderItem = ({ item }: { item: SamplingRecord }) => (
        <Card style={styles.card}>
            <View style={styles.rowBetween}>
                <Text style={styles.dateText}>
                    {new Date(item.samplingDate).toLocaleDateString()}
                </Text>
                <View style={styles.rowBetween}>
                    <Text style={styles.mbwText}>{item.mbwG ?? '--'} g</Text>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.roles.light.dangerText} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.detailRow}>
                {item.totalSamples != null && (
                    <View style={styles.metricPill}>
                        <Text style={styles.pillLabel}>{t('history.samplingPillSamples')}</Text>
                        <Text style={styles.pillValue}>{item.totalSamples}</Text>
                    </View>
                )}
                {item.biomassEstimationKg != null && (
                    <View style={styles.metricPill}>
                        <Text style={styles.pillLabel}>{t('history.samplingPillBiomass')}</Text>
                        <Text style={styles.pillValue}>{item.biomassEstimationKg} kg</Text>
                    </View>
                )}
                {item.srEstimationPercent != null && (
                    <View style={styles.metricPill}>
                        <Text style={styles.pillLabel}>{t('history.samplingPillSr')}</Text>
                        <Text style={styles.pillValue}>{item.srEstimationPercent}%</Text>
                    </View>
                )}
            </View>
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('history.samplingTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
            ) : error && records.length === 0 ? (
                <ErrorState title={t('history.couldNotLoad')} error={error} onRetry={handleRetry} />
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
                            <MaterialCommunityIcons name="ruler" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>{t('history.samplingEmptyTitle')}</Text>
                            <Text style={styles.emptyText}>{t('history.samplingEmptyText')}</Text>
                        </View>
                    }
                />
            )}

            <FAB icon="plus" onPress={() => navigation.navigate('SamplingLog', { pondId, pondName, cropId })} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[3] },
    deleteBtn: { marginLeft: theme.spacing[3] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    mbwText: { ...theme.typeScale.h4, color: theme.roles.light.primary },
    detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    metricPill: { backgroundColor: theme.roles.light.surfaceVariant, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2] },
    pillLabel: { ...theme.typeScale.labelSmall, color: theme.roles.light.textSecondary },
    pillValue: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, fontWeight: '600' },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2], fontStyle: 'italic' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
