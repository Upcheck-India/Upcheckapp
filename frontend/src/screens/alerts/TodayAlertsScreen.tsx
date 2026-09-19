/**
 * Today's alerts — every alert, one card each, with all its steps.
 *
 * Home's "Then" list and the briefing keep one row per pond (the top alert);
 * this is where the rest of them live. Reads GET /alert-center/all under the
 * `briefing` root so every log write that invalidates the briefing refreshes
 * this too.
 */
import React from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { CacheNotice } from '../../components/ui/CacheNotice';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SeverityPill } from '../../components/ui/SeverityPill';
import { MoltInlineAction } from '../../components/molt/MoltInlineAction';
import { alertCenterApi, type AlertSeverity, type BriefingActions } from '../../api/alertCenter';
import { alertsApi } from '../../api/alerts';
import { farmsApi } from '../../api/farms';
import { pondsApi } from '../../api/ponds';
import { apiErrorMessage } from '../../api/errors';
import { qk, queryClient } from '../../query/client';
import { useAppQuery, useRefetchOnFocus } from '../../query/hooks';
import { theme } from '../../theme';

const c = theme.roles.light;
const ALL_KEY = [...qk.briefing(), 'all'];
const SEVERITIES: AlertSeverity[] = ['critical', 'watch', 'info'];

const SOURCE_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    water: 'water-alert-outline',
    feed: 'silo-outline',
    disease: 'shield-alert-outline',
    compliance: 'alert-decagram-outline',
    lunar: 'moon-waning-crescent',
    harvest: 'calendar-clock',
    aeration: 'fan',
    weather: 'weather-lightning-rainy',
};
const BAR: Record<AlertSeverity, string> = { critical: c.dangerBorder, watch: c.warningBorder, info: c.infoBorder };

interface Row {
    key: string;
    pondId: string | null;
    farmId: string | null;
    source: string;
    severity: AlertSeverity;
    title: string;
    body: string;
    steps: string[];
    actions?: BriefingActions;
    /** Persisted alerts only — what "Mark as read" marks. */
    savedId?: string;
}

const loadAll = async (): Promise<Row[]> => {
    const { data } = await alertCenterApi.all();
    return [
        ...data.live.map((a) => ({ ...a })),
        ...data.saved.map((s) => ({
            key: `saved:${s.id}`,
            pondId: s.pondId,
            farmId: s.farmId,
            source: s.type,
            severity: s.severity,
            title: s.title,
            body: s.message,
            steps: s.steps,
            savedId: s.id,
        })),
    ];
};

export const TodayAlertsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const query = useAppQuery({ queryKey: ALL_KEY, queryFn: loadAll });
    useRefetchOnFocus(ALL_KEY);
    // Same cache keys Home and the Farms tab use: names cost no request of their own.
    const farmsQuery = useAppQuery({ queryKey: qk.farms(), queryFn: async () => (await farmsApi.getAll()).data });
    const pondsQuery = useAppQuery({ queryKey: qk.ponds(), queryFn: async () => (await pondsApi.getMine()).data });
    const [marking, setMarking] = React.useState<string | null>(null);

    const rows = query.data ?? null;
    const ponds = (pondsQuery.data ?? []) as { id: string; farmId: string; name: string; displayName?: string }[];
    const farms = (farmsQuery.data ?? []) as { id: string; name: string }[];

    const placeOf = (r: Row) => {
        const pond = r.pondId ? ponds.find((p) => p.id === r.pondId) : undefined;
        const farmId = r.farmId ?? pond?.farmId;
        const farm = farms.find((f) => f.id === farmId)?.name;
        const pondName = r.pondId ? pond?.displayName || pond?.name || t('alerts.aPond') : t('alerts.farmWide');
        return [pondName, farm].filter(Boolean).join(' · ');
    };

    const markRead = async (id: string) => {
        setMarking(id);
        try {
            await alertsApi.markAsRead(id);
            await queryClient.invalidateQueries({ queryKey: qk.briefing() });
        } catch (e) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('alerts.markReadFailed')));
        } finally {
            setMarking(null);
        }
    };

    const count = (s: AlertSeverity) => rows?.filter((r) => r.severity === s).length ?? 0;
    const refresh = () => query.refetch();

    return (
        <ScreenWrapper
            refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={refresh} colors={[c.primary]} tintColor={c.primary} />}
        >
            <View style={styles.head}>
                <Text style={styles.title} accessibilityRole="header">{t('alerts.title')}</Text>
                {!!rows?.length && (
                    <Text style={styles.counts}>{t('alerts.counts', { critical: count('critical'), watch: count('watch') })}</Text>
                )}
            </View>

            <CacheNotice updatedAt={query.dataUpdatedAt} stale={query.isError} />

            {query.isError && rows === null ? (
                <ErrorState error={query.error} onRetry={refresh} />
            ) : rows === null ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: theme.spacing[8] }} />
            ) : rows.length === 0 ? (
                <EmptyState
                    icon="check-circle-outline"
                    title={t('alerts.emptyTitle')}
                    subtitle={t('alerts.emptySub')}
                    actionLabel={t('alerts.openBrief')}
                    onAction={() => navigation.navigate('MorningBriefing')}
                />
            ) : (
                SEVERITIES.filter((s) => count(s) > 0).map((s) => (
                    <View key={s} style={styles.section}>
                        <Text style={styles.sectionLabel}>{t(`alerts.severity.${s}`)} · {count(s)}</Text>
                        {rows.filter((r) => r.severity === s).map((r) => (
                            <Card key={r.key} style={[styles.card, { borderLeftColor: BAR[r.severity] }]}>
                                <View style={styles.cardHead}>
                                    <MaterialCommunityIcons name={SOURCE_ICON[r.source] ?? 'bell-outline'} size={18} color={c.textSecondary} />
                                    <Text style={styles.place} numberOfLines={1}>{placeOf(r)}</Text>
                                    <SeverityPill severity={r.severity} label={t(`alerts.severity.${r.severity}`)} />
                                </View>
                                <Text style={styles.alertTitle}>{r.title}</Text>
                                {!!r.body && <Text style={styles.body}>{r.body}</Text>}
                                {r.steps.map((step, j) => (
                                    <View key={j} style={styles.step}>
                                        <MaterialCommunityIcons name="arrow-right-thin" size={16} color={c.primary} />
                                        <Text style={styles.stepText}>{step}</Text>
                                    </View>
                                ))}
                                <View style={styles.actions}>
                                    {!!r.pondId && (
                                        <TouchableOpacity
                                            accessibilityRole="button"
                                            style={styles.btn}
                                            onPress={() => navigation.navigate(r.source === 'lunar' ? 'Lunar' : 'PondDashboard', { pondId: r.pondId })}
                                        >
                                            <Text style={styles.btnLabel}>{t('alerts.openPond')}</Text>
                                        </TouchableOpacity>
                                    )}
                                    <MoltInlineAction
                                        item={{ pondId: r.pondId, topTitle: r.title, topSeverity: r.severity, source: r.source, steps: r.steps, alertCount: 1, actions: r.actions }}
                                        onLog={(route, params) => navigation.navigate(route, params)}
                                        style={styles.btn}
                                        labelStyle={styles.btnLabel}
                                    />
                                    {!!r.savedId && (
                                        <TouchableOpacity
                                            accessibilityRole="button"
                                            style={styles.btn}
                                            disabled={marking === r.savedId}
                                            onPress={() => markRead(r.savedId!)}
                                        >
                                            <Text style={styles.btnLabel}>{t('alerts.markRead')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </Card>
                        ))}
                    </View>
                ))
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    head: { marginBottom: theme.spacing[4] },
    title: { ...theme.typeScale.h1, color: c.textPrimary },
    counts: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginTop: theme.spacing[1] },
    section: { marginBottom: theme.spacing[4] },
    sectionLabel: { ...theme.typeScale.overline, color: c.textTertiary, marginBottom: theme.spacing[2] },
    card: { marginBottom: theme.spacing[3], padding: theme.spacing[4], borderLeftWidth: 4 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] },
    place: { ...theme.typeScale.labelMedium, color: c.textSecondary, flex: 1 },
    alertTitle: { ...theme.typeScale.labelLarge, fontSize: 16, color: c.textPrimary },
    body: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginBottom: theme.spacing[2] },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[1], marginTop: theme.spacing[1] },
    stepText: { ...theme.typeScale.bodySmall, color: c.textPrimary, flex: 1 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginTop: theme.spacing[3] },
    btn: {
        paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[1.5], minHeight: 36, justifyContent: 'center',
        borderRadius: theme.radius.md, borderWidth: 1, borderColor: c.primary,
    },
    btnLabel: { ...theme.typeScale.labelMedium, color: c.primary },
});

export default TodayAlertsScreen;
