import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { theme } from '../../../theme';
import { treatmentsApi, TreatmentRecord } from '../../../api/treatments';
import { useIngredientsStore, ingredientName } from '../../../features/ingredientsStore';
import { formatDate } from '../../../utils/formatDate';

export const TreatmentHistoryScreen = ({ route, navigation }: any) => {
    const { t, i18n } = useTranslation();
    const { pondId, pondName, cropId, farmId } = route.params;
    const catalogue = useIngredientsStore((s) => s.ingredients);

    /** "Mineral · Potassium chloride · Aqua Mineral Mix", else the old free text. */
    const summary = (r: TreatmentRecord) => {
        const names = (r.ingredientKeys ?? []).map((k) => {
            const i = catalogue.find((x) => x.key === k);
            return i ? ingredientName(i, i18n.language) : k;
        });
        const parts = [r.category ? t(`compliance.category.${r.category}`) : null, ...names, r.productName || null].filter(Boolean);
        return parts.length ? parts.join(' · ') : r.description;
    };
    const dose = (r: TreatmentRecord) =>
        r.doseValue != null && r.doseUnit
            ? `${Number(r.doseValue)} ${t(`compliance.unit.${r.doseUnit}`)}`
            : r.dosageKg != null
              ? `${r.dosageKg} kg`
              : null;
    const [records, setRecords] = useState<TreatmentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchRecords = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);
        setError(null);

        try {
            const { data } = cropId
                ? await treatmentsApi.getByCrop(cropId)
                : await treatmentsApi.getAll();
            const result: TreatmentRecord[] = Array.isArray(data) ? data : [];
            result.sort((a, b) => new Date(b.treatmentDate || b.createdAt || '').getTime() - new Date(a.treatmentDate || a.createdAt || '').getTime());
            setRecords(result);
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [cropId]);

    // Refetch on focus, not just mount — this screen stays mounted in the
    // stack, so logging a new reading and navigating back never showed it.
    useFocusEffect(useCallback(() => { fetchRecords(); }, [fetchRecords]));

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchRecords(true);
    }, [fetchRecords]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchRecords(true);
    }, [fetchRecords]);

    const renderItem = ({ item }: { item: TreatmentRecord }) => (
        <Card style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.dateText}>
                    {formatDate(item.treatmentDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <View style={styles.cardActions}>
                    {item.basedOn && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.basedOn}</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('TreatmentLog', { pondId, pondName, cropId, farmId, editRecord: item })}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.edit', 'Edit')}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.roles.light.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
            {item.bannedSubstanceFlag && item.bannedSubstanceFlag !== 'none' && (
                <View style={[styles.flagBanner, item.bannedSubstanceFlag === 'banned' ? styles.flagBannerBanned : styles.flagBannerRestricted]}>
                    <MaterialCommunityIcons name="alert-decagram-outline" size={14} color={item.bannedSubstanceFlag === 'banned' ? theme.roles.light.dangerText : theme.roles.light.warningText} />
                    <Text style={[styles.flagText, { color: item.bannedSubstanceFlag === 'banned' ? theme.roles.light.dangerText : theme.roles.light.warningText }]}>
                        {t('history.bannedFlagLabel', { names: (item.bannedSubstanceMatches ?? []).join(', ') })}
                    </Text>
                </View>
            )}
            <Text style={styles.productText}>{summary(item)}</Text>
            {!!(item.ingredientKeys?.length || item.productName) && !!item.description && (
                <Text style={styles.detailText}>{item.description}</Text>
            )}
            {dose(item) != null && (
                <View style={styles.dosageRow}>
                    <MaterialCommunityIcons name="pill" size={16} color={theme.roles.light.textSecondary} />
                    <Text style={styles.detailText}>
                        {dose(item)}
                        {item.reason ? ` · ${t(`compliance.reason.${item.reason}`)}` : ''}
                    </Text>
                </View>
            )}
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
            {/* Every flag change stays visible (D3.3). */}
            {(item.flagHistory ?? []).length > 0 && (
                <View style={styles.history}>
                    <Text style={styles.historyTitle}>{t('compliance.history.title')}</Text>
                    {(item.flagHistory ?? []).map((h, i) => (
                        <Text key={i} style={styles.notesText}>
                            {t('compliance.history.entry', {
                                date: formatDate(h.at, { day: 'numeric', month: 'short', year: 'numeric' }),
                                from: t(`compliance.flag.${h.from}`),
                                to: t(`compliance.flag.${h.to}`),
                                who: h.by === 'system' ? t('compliance.history.system') : t('compliance.history.member'),
                            })}
                            {h.reason ? ` — ${t(`compliance.flagChange.${h.reason}`, { defaultValue: h.reason })}` : ''}
                        </Text>
                    ))}
                </View>
            )}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('history.treatmentTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading && records.length === 0 ? (
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
                            <MaterialCommunityIcons name="medical-bag" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>{t('history.treatmentEmptyTitle')}</Text>
                            <Text style={styles.emptyText}>{t('history.treatmentEmptyText')}</Text>
                        </View>
                    }
                />
            )}

            <FAB icon="plus" onPress={() => navigation.navigate('TreatmentLog', { pondId, pondName, cropId, farmId })} />
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    badge: { backgroundColor: theme.roles.light.infoBg, paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    badgeText: { color: theme.roles.light.infoBorder, ...theme.typeScale.labelSmall, fontWeight: '700' },
    flagBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], alignSelf: 'flex-start', paddingHorizontal: theme.spacing[2], paddingVertical: 4, borderRadius: theme.radius.sm, marginBottom: theme.spacing[2] },
    flagBannerBanned: { backgroundColor: theme.roles.light.dangerBg },
    flagBannerRestricted: { backgroundColor: theme.roles.light.warningBg },
    flagText: { ...theme.typeScale.labelSmall, fontWeight: '700', flexShrink: 1 },
    productText: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[2] },
    dosageRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] },
    detailText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2] },
    history: { marginTop: theme.spacing[3], borderTopWidth: 1, borderTopColor: theme.roles.light.borderDefault, paddingTop: theme.spacing[2] },
    historyTitle: { ...theme.typeScale.labelSmall, fontWeight: '700', color: theme.roles.light.textSecondary },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
