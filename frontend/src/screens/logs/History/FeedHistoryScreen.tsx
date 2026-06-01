import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { theme } from '../../../theme';
import { feedApi, FeedRecord } from '../../../api/feedRecords';

export const FeedHistoryScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName, cropId } = route.params;
    const [records, setRecords] = useState<FeedRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchRecords = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);
        setError(null);

        try {
            const { data } = cropId
                ? await feedApi.getByCrop(cropId)
                : await feedApi.getAll(pondId);
            const pondRecords: FeedRecord[] = Array.isArray(data) ? data : (data as any).data || [];
            pondRecords.sort((a, b) => new Date(b.recordedAt || '').getTime() - new Date(a.recordedAt || '').getTime());
            setRecords(pondRecords);
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

    const totalFeed = records.reduce((sum, r) => sum + (r.quantityKg || 0), 0);

    const renderItem = ({ item }: { item: FeedRecord }) => (
        <Card style={styles.card}>
            <View style={styles.rowBetween}>
                <Text style={styles.dateText}>
                    {new Date(item.recordedAt || '').toLocaleDateString()}
                </Text>
                <Text style={styles.amountText}>{item.quantityKg} kg</Text>
            </View>
            {item.feedType && <Text style={styles.typeText}>{t('history.feedTypeLabel', { type: item.feedType })}</Text>}
            {item.feedingMethod && <Text style={styles.methodText}>{t('history.feedMethodLabel', { method: item.feedingMethod })}</Text>}
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('history.feedTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
            ) : error && records.length === 0 ? (
                <ErrorState title={t('history.couldNotLoad')} error={error} onRetry={handleRetry} />
            ) : (
                <>
                    {records.length > 0 && (
                        <View style={styles.summaryBar}>
                            <Text style={styles.summaryText}>
                                {t('history.feedTotalLabel')}<Text style={styles.summaryValue}>{t('history.feedTotalValue', { amount: totalFeed.toFixed(1) })}</Text>
                            </Text>
                        </View>
                    )}
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
                                <MaterialCommunityIcons name="food-drumstick-outline" size={64} color={theme.roles.light.borderDefault} />
                                <Text style={styles.emptyTitle}>{t('history.feedEmptyTitle')}</Text>
                                <Text style={styles.emptyText}>{t('history.feedEmptyText')}</Text>
                            </View>
                        }
                    />
                </>
            )}

            <FAB icon="plus" onPress={() => navigation.navigate('FeedLog', { pondId, pondName, cropId })} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryBar: { backgroundColor: theme.roles.light.infoBg, paddingVertical: theme.spacing[3], paddingHorizontal: theme.spacing[4] },
    summaryText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    summaryValue: { fontWeight: '700', color: theme.roles.light.infoText },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary },
    amountText: { ...theme.typeScale.h4, color: theme.roles.light.primary },
    typeText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginTop: 4 },
    methodText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: 2 },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2], fontStyle: 'italic' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
