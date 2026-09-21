import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { StaleNotice } from '../../../components/ui/CacheNotice';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { theme } from '../../../theme';
import { diseaseApi, DiseaseRecord } from '../../../api/diseases';
import { apiErrorMessage } from '../../../api/errors';
import { usePermissions } from '../../../hooks/usePermissions';
import { normaliseSeverity } from '../../../api/healthObservations';
import { PhotoStrip } from '../../../components/ui/PhotoStrip';
import { formatDate } from '../../../utils/formatDate';

const c = theme.roles.light;
const severityColors: Record<string, { bg: string; text: string }> = {
    mild: { bg: c.successBg, text: c.successText },
    moderate: { bg: c.warningBg, text: c.warningText },
    severe: { bg: c.dangerBg, text: c.dangerText },
};
const outcomeColors: Record<string, { bg: string; text: string }> = {
    ongoing: { bg: c.warningBg, text: c.warningText },
    recovered: { bg: c.successBg, text: c.successText },
    emergency_harvest: { bg: c.surfaceVariant, text: c.textSecondary },
    crop_lost: { bg: c.dangerBg, text: c.dangerText },
};

export const DiseaseHistoryScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName, cropId, farmId } = route.params;
    // Edit, delete and outcome changes are WRITE_MANAGEMENT on the server (403 otherwise).
    const perms = usePermissions(farmId);
    const [records, setRecords] = useState<DiseaseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchRecords = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);
        setError(null);
        try {
            if (cropId) {
                const { data } = await diseaseApi.getByCrop(cropId);
                setRecords([...data].sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime()));
            } else {
                setRecords([]);
            }
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [cropId]);

    // Refetch on focus — this screen stays mounted in the stack.
    useFocusEffect(useCallback(() => { fetchRecords(); }, [fetchRecords]));

    const handleDelete = useCallback((item: DiseaseRecord) => {
        Alert.alert(
            t('common.delete'),
            t('history.diseaseDeleteMsg', { date: formatDate(item.recordedDate, { day: 'numeric', month: 'short', year: 'numeric' }) }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await diseaseApi.remove(item.id);
                            setRecords((prev) => prev.filter((r) => r.id !== item.id));
                        } catch {
                            Alert.alert(t('common.error'), t('history.diseaseDeleteError'));
                        }
                    },
                },
            ],
        );
    }, [t]);

    const setOutcome = useCallback(async (item: DiseaseRecord, outcome: NonNullable<DiseaseRecord['outcome']>) => {
        try {
            await diseaseApi.update(item.id, { outcome });
            setRecords((prev) => prev.map((r) => (r.id === item.id ? { ...r, outcome } : r)));
            const params = { pondId, pondName, cropId, farmId };
            if (outcome === 'emergency_harvest') {
                // Opens as a Full harvest (H1/H2 reads `harvestType`).
                // TODO(M2 wave): carry `reason: 'disease'` into the close-why once it takes a prefill.
                navigation.navigate('HarvestLog', { ...params, harvestType: 'full', reason: 'disease' });
            }
            // TODO(H2): 'crop_lost' should open the close-with-reason flow once it lands.
        } catch (e) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('health.saveFailed')));
        }
    }, [navigation, pondId, pondName, cropId, farmId, t]);

    const renderItem = ({ item }: { item: DiseaseRecord }) => {
        const severity = item.severity ?? normaliseSeverity(item.severityAtDetection);
        const sev = severity ? severityColors[severity] : null;
        const outcome = item.outcome ?? 'ongoing';
        const oc = outcomeColors[outcome] ?? outcomeColors.ongoing;
        const name = item.disease?.name ?? t('health.unknownDisease');
        return (
            <Card style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.dateText}>{formatDate(item.recordedDate, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    <View style={styles.headerActions}>
                        {sev && (
                            <View style={[styles.chip, { backgroundColor: sev.bg }]}>
                                <Text style={[styles.chipText, { color: sev.text }]}>{t(`health.severity.${severity}`)}</Text>
                            </View>
                        )}
                        {perms.canManageOperations && (
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('DiseaseLog', { pondId, pondName, cropId, editRecord: item })}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('common.edit', 'Edit')}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={20} color={c.textDisabled} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={c.textDisabled} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
                {item.bannedSubstanceFlag && item.bannedSubstanceFlag !== 'none' && (
                    <View style={[styles.flagBanner, item.bannedSubstanceFlag === 'banned' ? styles.flagBannerBanned : styles.flagBannerRestricted]}>
                        <MaterialCommunityIcons name="alert-decagram-outline" size={14} color={item.bannedSubstanceFlag === 'banned' ? c.dangerText : c.warningText} />
                        <Text style={[styles.flagText, { color: item.bannedSubstanceFlag === 'banned' ? c.dangerText : c.warningText }]}>
                            {t('history.bannedFlagLabel', { names: (item.bannedSubstanceMatches ?? []).join(', ') })}
                        </Text>
                    </View>
                )}
                <Text style={styles.diseaseName}>{name}</Text>
                <View style={[styles.chip, styles.outcomeChip, { backgroundColor: oc.bg }]}>
                    <Text style={[styles.chipText, { color: oc.text }]}>{t(`health.outcome.${outcome}`)}</Text>
                </View>
                {!!item.symptomSigns?.length && (
                    <Text style={styles.metaText}>{item.symptomSigns.map((s) => t(`health.sign.${s}`)).join(' · ')}</Text>
                )}
                {item.affectedPct != null && <Text style={styles.metaText}>{t('health.affectedPctValue', { value: Number(item.affectedPct) })}</Text>}
                {!!item.confirmedBy && (
                    <Text style={styles.metaText}>
                        {t(`health.confirmed.${item.confirmedBy}`)}{item.labName ? ` · ${item.labName}` : ''}
                    </Text>
                )}
                {!!item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
                {!!item.photoSignedUrls?.length && (
                    <View style={styles.photoRow}>
                        <PhotoStrip full={item.photoSignedUrls} thumbs={item.photoThumbUrls} />
                    </View>
                )}
                {outcome === 'ongoing' && perms.canManageOperations && (
                    <View style={styles.outcomeBox} testID={`outcome-actions-${item.id}`}>
                        <Text style={styles.metaText}>{t('health.stillOngoing')}</Text>
                        <View style={styles.outcomeRow}>
                            {(['recovered', 'emergency_harvest', 'crop_lost'] as const).map((o) => (
                                <TouchableOpacity key={o} style={styles.outcomeBtn} onPress={() => setOutcome(item, o)} accessibilityRole="button">
                                    <Text style={styles.outcomeBtnText}>{t(`health.mark.${o}`)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </Card>
        );
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('history.diseaseTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <StaleNotice visible={!!error && records.length > 0} />
            {isLoading && records.length === 0 ? (
                <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : error && records.length === 0 ? (
                <ErrorState title={t('history.couldNotLoad')} error={error} onRetry={() => fetchRecords(true)} />
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchRecords(true); }} colors={[c.primary]} tintColor={c.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="bug-outline" size={64} color={c.borderDefault} />
                            <Text style={styles.emptyTitle}>{t('history.diseaseEmptyTitle')}</Text>
                            <Text style={styles.emptyText}>{t('history.diseaseEmptyText')}</Text>
                        </View>
                    }
                />
            )}

            <FAB icon="plus" onPress={() => navigation.navigate('DiseaseLog', { pondId, pondName, cropId })} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: c.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
    dateText: { ...theme.typeScale.labelLarge, color: c.textSecondary },
    chip: { paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    chipText: { ...theme.typeScale.labelSmall, fontWeight: '700' },
    outcomeChip: { alignSelf: 'flex-start', marginBottom: theme.spacing[2] },
    diseaseName: { ...theme.typeScale.h4, color: c.textPrimary, marginBottom: theme.spacing[2] },
    metaText: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginBottom: theme.spacing[1] },
    flagBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], alignSelf: 'flex-start', paddingHorizontal: theme.spacing[2], paddingVertical: 4, borderRadius: theme.radius.sm, marginBottom: theme.spacing[2] },
    flagBannerBanned: { backgroundColor: c.dangerBg },
    flagBannerRestricted: { backgroundColor: c.warningBg },
    flagText: { ...theme.typeScale.labelSmall, fontWeight: '700', flexShrink: 1 },
    notesText: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginTop: theme.spacing[2] },
    photoRow: { marginTop: theme.spacing[3] },
    outcomeBox: { marginTop: theme.spacing[3], gap: theme.spacing[1.5] },
    outcomeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    outcomeBtn: { paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[1.5], borderRadius: theme.radius.md, borderWidth: 1, borderColor: c.primary },
    outcomeBtnText: { ...theme.typeScale.labelMedium, color: c.primary },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: c.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
});
