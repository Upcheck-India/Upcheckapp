import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useCachedFetch } from '../../../query/hooks';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { PhotoStrip } from '../../../components/ui/PhotoStrip';
import { StaleNotice } from '../../../components/ui/CacheNotice';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { theme } from '../../../theme';
import { harvestsApi, HarvestRecord } from '../../../api/harvests';
import { usePermissions } from '../../../hooks/usePermissions';
import { groupIndian } from '../../../features/inrFormat';
import { formatDate } from '../../../utils/formatDate';

/** Weighted buyer count (pieces/kg): from the grades, else implied by g/piece. */
const avgCountOf = (h: HarvestRecord): number | null => {
    const graded = (h.grades ?? []).filter((g) => g.countPerKg != null);
    const kg = graded.reduce((s, g) => s + Number(g.weightKg), 0);
    if (kg > 0) return Math.round(graded.reduce((s, g) => s + Number(g.weightKg) * Number(g.countPerKg), 0) / kg);
    return h.averageSize ? Math.round(1000 / Number(h.averageSize)) : null;
};

export const HarvestHistoryScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    // The pond's label travels with the navigation params (PondDashboard sends
    // it). Passing '' onward left the harvest form headed by a blank line.
    // `cropId` is only sent while the pond has an ACTIVE cycle.
    const { pondId, cropId, pondName, farmId } = route.params;
    const { canRecordHarvest } = usePermissions(farmId);
    // Paints the last list instantly and revalidates on every focus.
    const { data, isInitialLoading: isLoading, isRefreshing, error, refresh: handleRefresh } = useCachedFetch(
        ['harvestHistory', pondId ?? null, cropId ?? null],
        async (): Promise<HarvestRecord[]> => {
            /*
             * A pond, when we have one, beats a single crop: harvests run
             * across successive cycles on the same pond and the farmer is
             * asking for THAT pond's run, not one cycle of it.
             *
             * There is deliberately no `getAll()` fallback any more. With
             * neither id it returned every harvest on every farm the user can
             * reach and drew them under this pond's title — other ponds'
             * tonnage, summed into "total harvested", on a screen a farmer
             * reads as one pond's record. No scope, no list.
             */
            if (!pondId && !cropId) return [];
            const { data } = pondId
                ? await harvestsApi.getByPond(pondId)
                : await harvestsApi.getByCrop(cropId);
            const result: HarvestRecord[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
            return result.sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime());
        },
    );
    const records = data ?? [];
    const handleRetry = handleRefresh;

    const totalBiomass = records.reduce((sum, r) => sum + (Number(r.weightKg) || 0), 0);

    // Per-cycle subtotal: kg always; ₹ only when every harvest in the cycle
    // carries a (visible) price — a masked or missing one is not ₹0.
    const cycleTotals = useMemo(() => {
        const m = new Map<string, { kg: number; money: number | null }>();
        for (const r of records) {
            const c = m.get(r.cropId) ?? { kg: 0, money: 0 };
            c.kg += Number(r.weightKg) || 0;
            c.money = c.money == null || r.salePriceTotal == null ? null : c.money + Number(r.salePriceTotal);
            m.set(r.cropId, c);
        }
        return m;
    }, [records]);

    const renderItem = ({ item, index }: { item: HarvestRecord; index: number }) => {
        const firstOfCycle = index === 0 || records[index - 1].cropId !== item.cropId;
        const cycle = cycleTotals.get(item.cropId);
        const gradeCount = item.grades?.length ?? 0;
        const avg = avgCountOf(item);
        const line = [
            `${groupIndian(Number(item.weightKg))} kg`,
            gradeCount > 1 ? t('logs.harvest_historyGrades', { count: gradeCount }) : null,
            avg != null ? t('logs.harvest_historyAvg', { count: avg }) : null,
        ].filter(Boolean).join(' · ');
        return (
            <>
                {firstOfCycle && cycle && (
                    <Text style={styles.cycleHeader}>
                        {cycle.money != null
                            ? t('logs.harvest_historyCycleMoney', { kg: groupIndian(cycle.kg), amount: groupIndian(cycle.money) })
                            : t('logs.harvest_historyCycle', { kg: groupIndian(cycle.kg) })}
                    </Text>
                )}
                <Card style={styles.card}>
                    <View style={styles.headerRow}>
                        <Text style={styles.dateText}>
                            {formatDate(item.harvestDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                        <View style={styles.cardActions}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.harvestType.toUpperCase()}</Text>
                            </View>
                            {canRecordHarvest && (
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('HarvestLog', { pondId, pondName: pondName ?? '', cropId: item.cropId, farmId, editRecord: item })}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('common.edit', 'Edit')}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.roles.light.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <Text style={styles.metricValue}>{line}</Text>

                    {item.buyerName && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="account-outline" size={16} color={theme.roles.light.textSecondary} />
                            <Text style={styles.detailText}>{t('history.harvestBuyerLabel', { name: item.buyerName })}</Text>
                        </View>
                    )}
                    {item.salePriceTotal != null && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.roles.light.textSecondary} />
                            <Text style={styles.detailText}>{t('history.harvestSaleLabel', { amount: `₹${groupIndian(Number(item.salePriceTotal))}` })}</Text>
                        </View>
                    )}
                    {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
                    {!!item.photoSignedUrls?.length && (
                        <View style={styles.photos}>
                            <PhotoStrip full={item.photoSignedUrls} thumbs={item.photoThumbUrls} size={56} />
                        </View>
                    )}
                </Card>
            </>
        );
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('history.harvestTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <StaleNotice visible={!!error && records.length > 0} />
            {isLoading && records.length === 0 ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
            ) : error && records.length === 0 ? (
                <ErrorState title={t('history.couldNotLoad')} error={error} onRetry={handleRetry} />
            ) : (
                <>
                    {records.length > 0 && (
                        <View style={styles.summaryBar}>
                            <Text style={styles.summaryText}>
                                {t('history.harvestTotalLabel')}<Text style={styles.summaryValue}>{t('history.harvestTotalValue', { amount: totalBiomass.toLocaleString() })}</Text>
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
                                <MaterialCommunityIcons name="basket-outline" size={64} color={theme.roles.light.borderDefault} />
                                <Text style={styles.emptyTitle}>{t('history.harvestEmptyTitle')}</Text>
                                <Text style={styles.emptyText}>{t('history.harvestEmptyText')}</Text>
                            </View>
                        }
                    />
                </>
            )}

            {canRecordHarvest && (
                // No active cycle → the FAB stays, dimmed, and says why
                // (a harvest needs a cycle to close/draw down).
                <FAB
                    icon="plus"
                    style={cropId ? undefined : styles.fabDisabled}
                    accessibilityLabel={cropId ? undefined : t('logs.harvest_noActiveCycle')}
                    onPress={() =>
                        cropId
                            ? navigation.navigate('HarvestLog', { pondId, pondName: pondName ?? '', cropId, farmId })
                            : Alert.alert(t('history.harvestTitle'), t('logs.harvest_noActiveCycle'))
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryBar: { backgroundColor: theme.roles.light.successBg, paddingVertical: theme.spacing[3], paddingHorizontal: theme.spacing[4] },
    summaryText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    summaryValue: { fontWeight: '700', color: theme.roles.light.successText },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[4] },
    cycleHeader: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
    fabDisabled: { opacity: 0.4 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
    badge: { backgroundColor: theme.roles.light.successText + '15', paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    badgeText: { color: theme.roles.light.successText, ...theme.typeScale.labelSmall, fontWeight: '700' },
    metricsRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: theme.spacing[8], marginBottom: theme.spacing[4] },
    metricBlock: {},
    metricLabel: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary, marginBottom: 4 },
    metricValue: { ...theme.typeScale.h2, color: theme.roles.light.textPrimary },
    metricUnit: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textSecondary },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginTop: theme.spacing[2] },
    detailText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2] },
    photos: { marginTop: theme.spacing[2] },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
