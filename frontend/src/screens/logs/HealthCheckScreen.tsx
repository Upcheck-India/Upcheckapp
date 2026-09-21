/**
 * Health check (spec D6): 11 signs, each None / Few / Many, plus an optional
 * photo. One screen, one save. A sign left untouched is "not checked" and is
 * not written; "None" is written, because "checked, none" is a finding.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PhotoStrip } from '../../components/ui/PhotoStrip';
import { ErrorState } from '../../components/ui/ErrorState';
import { StaleNotice } from '../../components/ui/CacheNotice';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ChoiceChips } from '../../components/health/ChoiceChips';
import { HealthPhotoPicker } from '../../components/health/HealthPhotoPicker';
import { theme } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import { todayLocalISODate } from '../../utils/localDate';
import { formatDate } from '../../utils/formatDate';
import { apiErrorMessage } from '../../api/errors';
import { HEALTH_SIGNS, healthObservationsApi, type HealthLevel, type HealthObservation, type HealthSign } from '../../api/healthObservations';

/**
 * P1: group one check's per-sign rows back into one card. Every sign saved
 * together shares the same `observedOn` day and `photoUrls` (they're written
 * from one `signs[]` array in one call) — signs grouped by day, with one
 * photo strip per day rather than one per sign, is what stops the same
 * photo rendering N times.
 */
function groupByDay(rows: HealthObservation[]) {
    const byDay = new Map<string, HealthObservation[]>();
    for (const r of rows) {
        byDay.set(r.observedOn, [...(byDay.get(r.observedOn) ?? []), r]);
    }
    return [...byDay.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([observedOn, group]) => ({
            observedOn,
            signs: group.filter((r) => r.level !== 'none'),
            photoSignedUrls: group.find((r) => r.photoSignedUrls?.length)?.photoSignedUrls ?? [],
            photoThumbUrls: group.find((r) => r.photoThumbUrls?.length)?.photoThumbUrls ?? [],
        }));
}

const LEVELS: HealthLevel[] = ['none', 'few', 'many'];

export const HealthCheckScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName, cropId, reason, view } = route.params ?? {};
    // The pond's History tile opens this screen too; there it is a read-only list.
    const historyOnly = view === 'history';
    const [levels, setLevels] = useState<Partial<Record<HealthSign, HealthLevel>>>({});
    const [photos, setPhotos] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    // null = not loaded yet. An empty array is a real answer ("no checks");
    // "still loading" and "could not load" must never render as it.
    const [recent, setRecent] = useState<HealthObservation[] | null>(null);
    const [loadError, setLoadError] = useState<unknown>(null);

    const signs = HEALTH_SIGNS.filter((s) => levels[s]).map((s) => ({ sign: s, level: levels[s]! }));

    // P1: this screen is the only place health-check photos were ever
    // uploaded from, and until now the only place they went to see them
    // again. Refetch on focus — a save on this same screen must show up
    // immediately, and React Navigation keeps the screen mounted.
    const loadRecent = useCallback(async () => {
        if (!pondId) return;
        try {
            // 90 is the backend's ceiling for this endpoint.
            const { data } = await healthObservationsApi.listForPond(pondId, historyOnly ? 90 : 7);
            setRecent(data);
            setLoadError(null);
        } catch (e) {
            // Never blocks logging, and never wipes what is already on screen:
            // a failed refetch keeps the previous list.
            setLoadError(e);
        }
    }, [pondId, historyOnly]);
    const days = groupByDay(recent ?? []);
    useFocusEffect(useCallback(() => { void loadRecent(); }, [loadRecent]));

    const save = async () => {
        if (!signs.length) {
            Alert.alert(t('common.error'), t('health.pickOne'));
            return;
        }
        setSaving(true);
        try {
            const res = await healthObservationsApi.save({
                pondId,
                cropId,
                observedOn: todayLocalISODate(),
                source: 'quick',
                photoUrls: photos.length ? photos : undefined,
                signs,
            });
            showToast({
                message: res.queued ? t('common.savedOffline', 'Saved — will sync when online') : t('common.savedSuccess'),
                type: 'success',
            });
            navigation.goBack();
        } catch (e) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('health.saveFailed')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{historyOnly ? t('history.healthCheckHistoryTitle') : t('health.checkTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {!!pondName && !historyOnly && <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>}
                {historyOnly && recent === null && !loadError && (
                    <View testID="health-check-loading"><SkeletonList count={3} /></View>
                )}
                {historyOnly && recent === null && !!loadError && (
                    <ErrorState title={t('history.couldNotLoad')} error={loadError} onRetry={() => { setLoadError(null); void loadRecent(); }} />
                )}
                {historyOnly && <StaleNotice visible={recent !== null && !!loadError} />}
                {historyOnly && recent !== null && !days.length && (
                    <Text style={styles.hint} testID="health-check-empty">{t('history.healthCheckEmptyText')}</Text>
                )}
                {!historyOnly && (<>
                {reason === 'spike' && <Text style={styles.reason}>{t('health.spikeReason')}</Text>}
                <Text style={styles.hint}>{t('health.checkHint')}</Text>
                <Card style={styles.card}>
                    {HEALTH_SIGNS.map((s) => (
                        <View key={s} style={styles.signRow} testID={`sign-${s}`}>
                            <Text style={styles.signLabel}>{t(`health.sign.${s}`)}</Text>
                            <ChoiceChips
                                options={LEVELS.map((l) => ({ key: l, label: t(`health.level.${l}`) }))}
                                value={levels[s]}
                                onChange={(l) => setLevels((prev) => ({ ...prev, [s]: l ?? undefined }))}
                                testIDPrefix={`level-${s}`}
                            />
                        </View>
                    ))}
                </Card>
                <Card style={styles.card}>
                    <HealthPhotoPicker pondId={pondId} value={photos} onChange={setPhotos} />
                </Card>
                <Button title={t('logs.saveRecord')} onPress={save} loading={saving} disabled={!signs.length} />
                </>)}
                {/* Every check counts as history, with or without a photo. */}
                {days.length > 0 && (
                    <Card style={[styles.card, !historyOnly && styles.recentCard]}>
                        {!historyOnly && <Text style={styles.recentTitle}>{t('history.healthCheckRecentTitle')}</Text>}
                        {days.map((d) => (
                            <View key={d.observedOn} style={styles.recentRow} testID={`health-check-day-${d.observedOn}`}>
                                <Text style={styles.dateText}>{formatDate(d.observedOn, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                                <Text style={styles.metaText}>
                                    {d.signs.length
                                        ? d.signs.map((s) => `${t(`health.sign.${s.sign}`)} (${t(`health.level.${s.level}`)})`).join(' · ')
                                        : t('history.healthCheckAllClear')}
                                </Text>
                                {!!d.photoThumbUrls.length && (
                                    <PhotoStrip full={d.photoSignedUrls} thumbs={d.photoThumbUrls} />
                                )}
                            </View>
                        ))}
                    </Card>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
    reason: { ...theme.typeScale.bodyMedium, color: theme.roles.light.warningText, marginBottom: theme.spacing[2] },
    hint: { ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary, marginBottom: theme.spacing[4] },
    card: { marginBottom: theme.spacing[4] },
    signRow: { paddingVertical: theme.spacing[2], gap: theme.spacing[1.5] },
    signLabel: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    recentCard: { marginTop: theme.spacing[4] },
    recentTitle: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[2] },
    recentRow: { marginBottom: theme.spacing[3], gap: theme.spacing[1.5] },
    dateText: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary },
    metaText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary },
});
