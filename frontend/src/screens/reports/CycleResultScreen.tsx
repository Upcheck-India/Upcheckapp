/**
 * Cycle Result (harvest-and-molt H3 + disease spec §3.1 welfare). Opened after
 * a full harvest and from CycleDetail for a completed cycle.
 *
 * Honesty rules live server-side (GET /crops/:id/result); this screen only
 * renders them: a null is "not logged", never 0, and money appears only when
 * the server sent it (VIEW_FINANCIALS).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { theme } from '../../theme';
import { reportsApi, type CycleResult, type Band } from '../../api/reports';
import { treatmentsApi, type CycleCompliance } from '../../api/treatments';
import { formatINR, groupIndian } from '../../features/inrFormat';
import { formatDate } from '../../utils/formatDate';
import { useFlag } from '../../features/remoteFlags';
import { usePermissions } from '../../hooks/usePermissions';
import { useUIStore } from '../../store/uiStore';
import { useSavePhotos } from '../../components/photos/useSavePhotos';

const c = theme.roles.light;
const BAND_COLOR: Record<Band, string> = { good: c.successText, fair: c.warningText, poor: c.dangerText };
const day = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
};

export const CycleResultScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const exportOn = useFlag('export');
    const { cropId } = route.params ?? {};
    const [data, setData] = useState<CycleResult | null>(null);
    const [compliance, setCompliance] = useState<CycleCompliance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);
    const { canStartCycle, isOwner, isManager } = usePermissions(data?.farmId);
    const showToast = useUIStore((s) => s.showToast);
    const { save: savePhotos, progress: savingPhotos } = useSavePhotos((message, type) => showToast({ message, type }));

    const load = useCallback(() => {
        setError(null);
        reportsApi
            .getCycleResult(cropId)
            .then(({ data: r }) => setData(r))
            .catch((err) => setError(err))
            .finally(() => setLoading(false));
        // Safety, not money: every role may read it. A failure is "not logged".
        treatmentsApi
            .compliance(cropId)
            .then(({ data: r }) => setCompliance(r))
            .catch(() => setCompliance(null));
    }, [cropId]);
    // A harvest can be edited elsewhere; refetch on focus (screens stay mounted).
    useFocusEffect(load);

    const notLogged = t('reports.notLogged');

    const header = (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{t('reports.resultTitle')}</Text>
            <View style={styles.iconBtn} />
        </View>
    );

    if (loading) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                {header}
                <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
            </ScreenWrapper>
        );
    }
    if (!data) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                {header}
                <ErrorState title={t('reports.errorLoad')} error={error} onRetry={() => { setLoading(true); load(); }} />
            </ScreenWrapper>
        );
    }

    const { money, survival, welfare } = data;
    const survivalText = survival
        ? survival.low != null && survival.high != null
            ? t('reports.survivalRange', { low: survival.low, high: survival.high })
            : `${survival.pct}%`
        : notLogged;

    const tiles: { label: string; value: string; band?: Band | null; read?: string; notes: string[] }[] = [
        {
            label: t('reports.tileFcr'),
            value: data.fcr != null ? data.fcr.toFixed(2) : notLogged,
            band: data.fcrBand,
            read: data.fcrBand ? t(`reports.fcrRead.${data.fcrBand}`) : undefined,
            notes: data.untaggedFeedLogs > 0 ? [t('reports.untaggedFeed', { count: data.untaggedFeedLogs })] : [],
        },
        {
            label: t('reports.tileSurvival'),
            value: survivalText,
            band: data.srBand,
            read: data.srBand ? t(`reports.srRead.${data.srBand}`) : undefined,
            notes: survival?.estimated ? [t('reports.estimated')] : [],
        },
        {
            label: t('reports.tileAvgCount'),
            value: data.avgCount != null ? t('reports.avgCountValue', { count: data.avgCount }) : notLogged,
            notes: [],
        },
        {
            label: t('reports.tileAdg'),
            value: data.adgGPerDay != null ? t('reports.adgValue', { g: data.adgGPerDay }) : notLogged,
            notes: data.adgGPerDay != null ? [t('reports.adgNote', { g: data.stockingAbwAssumedG })] : [],
        },
    ];

    const amText = !compliance
        ? notLogged
        : compliance.status === 'banned_logged'
          ? t('reports.welfare.amBanned')
          : compliance.status === 'restricted_logged'
            ? t('reports.welfare.amRestricted')
            : t('reports.welfare.amNone');
    const daysOf = (v: { days: number; of: number } | null) => (v ? t('reports.welfare.daysOf', v) : notLogged);
    const welfareRows: [string, string][] = [
        [t('reports.welfare.survival'), survivalText],
        [t('reports.welfare.doLow'), daysOf(welfare.doBelow3Days)],
        [t('reports.welfare.nh3'), daysOf(welfare.nh3CriticalDays)],
        [
            t('reports.welfare.handling'),
            welfare.handlingInMoltPeak != null ? t('reports.welfare.handlingDays', { n: welfare.handlingInMoltPeak }) : notLogged,
        ],
        [t('reports.welfare.antimicrobial'), amText],
        [
            t('reports.welfare.biosecurity'),
            welfare.biosecurity ? t('reports.welfare.bioDone', welfare.biosecurity) : notLogged,
        ],
        [
            t('reports.welfare.seedPcr'),
            welfare.seedPcr
                ? welfare.seedPcr.date
                    ? t('reports.welfare.pcrTestedOn', { date: day(welfare.seedPcr.date) })
                    : t('reports.welfare.pcrTested')
                : notLogged,
        ],
    ];

    return (
        <ScreenWrapper scroll={false} padded={false}>
            {header}
            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    {data.lost ? (
                        <>
                            <Text style={[styles.heroBig, { color: c.dangerText }]}>{t('reports.cropLost')}</Text>
                            <Text style={styles.muted}>{t('reports.cropLostSub')}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.heroLine}>
                                {t('reports.heroLine', { pond: data.pondName, days: data.doc ?? '—', kg: groupIndian(data.harvestedKg) })}
                                {data.yield ? ` · ${t('reports.heroYield', { t: data.yield.tPerHa })}` : ''}
                            </Text>
                            {data.yield?.areaAssumed ? <Text style={styles.muted}>{t('reports.areaAssumed')}</Text> : null}
                        </>
                    )}
                    {money ? (
                        <>
                            <Text style={[styles.heroBig, { color: money.profit >= 0 ? c.successText : c.dangerText }]}>
                                {t(money.profit >= 0 ? 'reports.profit' : 'reports.loss', { amount: formatINR(Math.abs(money.profit)) })}
                            </Text>
                            <Text style={styles.muted}>
                                {t('reports.moneyLine', { revenue: formatINR(money.revenue), cost: formatINR(money.cost) })}
                                {money.breakEvenPricePerKg != null ? ` · ${t('reports.breakEven', { amount: formatINR(money.breakEvenPricePerKg) })}` : ''}
                            </Text>
                        </>
                    ) : null}
                </Card>

                <View style={styles.grid}>
                    {tiles.map((tile) => (
                        <Card key={tile.label} style={styles.tile}>
                            <Text style={styles.tileLabel}>{tile.label}</Text>
                            <Text style={styles.tileValue}>{tile.value}</Text>
                            {tile.band ? (
                                <Text style={[styles.tileBand, { color: BAND_COLOR[tile.band] }]}>
                                    {t(`reports.band.${tile.band}`)} · {tile.read}
                                </Text>
                            ) : null}
                            {tile.notes.map((n) => <Text key={n} style={styles.note}>{n}</Text>)}
                        </Card>
                    ))}
                </View>
                <Text style={styles.note}>{t('reports.bandsNote')}</Text>

                {data.gradeMix.length > 0 && (
                    <Card style={styles.card}>
                        <Text style={styles.sectionTitle}>{t('reports.gradeMix')}</Text>
                        {data.gradeMix.map((g) => (
                            <Text key={g.countPerKg} style={styles.row}>
                                {t('reports.gradeRow', { count: g.countPerKg, kg: groupIndian(g.kg), pct: g.pct })}
                            </Text>
                        ))}
                    </Card>
                )}

                {/* Only real deltas; absent when nothing applies — no generic advice. */}
                {data.nextCycle.length > 0 && (
                    <Card style={styles.card} testID="next-cycle">
                        <Text style={styles.sectionTitle}>{t('reports.nextTitle')}</Text>
                        {data.nextCycle.map((line) => (
                            <Text key={line.key} style={styles.row}>
                                • {t(`reports.next.${line.key}`, {
                                    ...line.params,
                                    ...(line.key === 'mortalitySpike' ? { date: day(String(line.params.date)) } : {}),
                                })}
                            </Text>
                        ))}
                    </Card>
                )}

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('reports.welfareTitle')}</Text>
                    {welfareRows.map(([label, value]) => (
                        <View key={label} style={styles.kv}>
                            <Text style={styles.kvLabel}>{label}</Text>
                            <Text style={styles.kvValue}>{value}</Text>
                        </View>
                    ))}
                    <View style={styles.kv}>
                        <Text style={styles.kvLabel}>{t('reports.welfare.disease')}</Text>
                        <View style={styles.kvValueCol}>
                            {welfare.diseases == null ? (
                                <Text style={styles.kvValue}>{notLogged}</Text>
                            ) : welfare.diseases.length === 0 ? (
                                <Text style={styles.kvValue}>{t('reports.welfare.noneRecorded')}</Text>
                            ) : (
                                welfare.diseases.map((d, i) => (
                                    <Text key={`${d.recordedDate}-${i}`} style={styles.kvValue}>
                                        {t('reports.welfare.diseaseRow', {
                                            name: d.name ?? t('reports.welfare.diseaseUnknown'),
                                            date: day(d.recordedDate),
                                            outcome: t(`reports.welfare.outcome.${d.outcome ?? 'unknown'}`),
                                        })}
                                    </Text>
                                ))
                            )}
                        </View>
                    </View>
                </Card>

                {exportOn && (
                    <Button
                        title={t('reports.share')}
                        variant="outlined"
                        onPress={() => navigation.navigate('Export', { dataset: 'cycle', cropId })}
                        style={styles.action}
                    />
                )}
                {/* D4: shared outside the farm, so owner/manager only. */}
                {exportOn && (isOwner || isManager) && (
                    <Button
                        title={t('export.dataset_inputRecord')}
                        variant="outlined"
                        onPress={() =>
                            navigation.navigate('Export', {
                                dataset: 'inputRecord', cropId, pondId: data.pondId, farmId: data.farmId,
                            })
                        }
                        style={styles.action}
                    />
                )}
                {/* F4.3: the whole cycle's photos as one zip (any member who can read the pond). */}
                <Button
                    title={savingPhotos ?? t('storage.backup.saveCycle')}
                    variant="outlined"
                    onPress={() => void savePhotos({ cropId })}
                    loading={!!savingPhotos}
                    style={styles.action}
                />
                {canStartCycle && data.status !== 'active' && (
                    <Button
                        title={t('reports.startNext')}
                        // replace, not navigate: CreateCycle goBack()s on success, which
                        // otherwise lands the farmer back on this old cycle's report.
                        onPress={() => navigation.replace('CreateCycle', { pondId: data.pondId })}
                        style={styles.action}
                    />
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: theme.spacing[4], borderBottomWidth: 1, borderBottomColor: c.borderDefault, backgroundColor: c.surface,
    },
    iconBtn: { padding: theme.spacing[4], width: 56 },
    title: { ...theme.typeScale.h3, color: c.textPrimary, flex: 1, textAlign: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[4] },
    heroLine: { ...theme.typeScale.h4, color: c.textPrimary },
    heroBig: { ...theme.typeScale.numericLarge, marginTop: theme.spacing[2] },
    muted: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginTop: theme.spacing[1] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[3], marginBottom: theme.spacing[2] },
    tile: { width: '47%', padding: theme.spacing[3] },
    tileLabel: { ...theme.typeScale.labelSmall, color: c.textSecondary },
    tileValue: { ...theme.typeScale.numericMedium, color: c.textPrimary, marginTop: theme.spacing[1] },
    tileBand: { ...theme.typeScale.bodySmall, marginTop: theme.spacing[1] },
    note: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[1], marginBottom: theme.spacing[2] },
    sectionTitle: { ...theme.typeScale.h4, color: c.textPrimary, marginBottom: theme.spacing[3] },
    row: { ...theme.typeScale.bodyMedium, color: c.textPrimary, marginBottom: theme.spacing[2] },
    kv: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing[3], marginBottom: theme.spacing[2] },
    kvLabel: { ...theme.typeScale.bodyMedium, color: c.textSecondary, flex: 1 },
    kvValue: { ...theme.typeScale.bodyMedium, color: c.textPrimary, textAlign: 'right' },
    kvValueCol: { flex: 1, alignItems: 'flex-end' },
    action: { marginBottom: theme.spacing[3] },
});

export default CycleResultScreen;
