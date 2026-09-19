import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { LineChart } from '../../components/charts/LineChart';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../theme';
import { reportsApi, type CycleResult } from '../../api/reports';
import { useFlag } from '../../features/remoteFlags';

const c = theme.roles.light;

export const CycleAnalysisScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const exportOn = useFlag('export');
    const { cycleId, cycleName } = route.params ?? {};
    const [data, setData] = useState<CycleResult | null>(null);
    const [loading, setLoading] = useState(true);

    // The SAME metrics as the Cycle Result (H3): crop-scoped FCR, survival
    // from harvested pieces — one formula, one answer per cycle.
    useEffect(() => {
        reportsApi
            .getCycleResult(cycleId)
            .then(({ data }) => setData(data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [cycleId]);

    const notLogged = t('reports.notLogged');
    const sr = data?.survival;
    const metrics = data
        ? [
              { label: t('reports.fcr'), value: data.fcr != null ? data.fcr.toFixed(2) : notLogged },
              {
                  label: t('reports.survival'),
                  value: !sr
                      ? notLogged
                      : sr.low != null && sr.high != null
                        ? t('reports.survivalRange', { low: sr.low, high: sr.high })
                        : `${sr.pct}%`,
              },
              { label: t('reports.totalFeed'), value: Number(data.feedKg || 0).toFixed(0) },
              { label: t('reports.totalHarvest'), value: Number(data.harvestedKg || 0).toFixed(0) },
          ]
        : [];

    const growth = data?.growthChart ?? [];

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>
                    {cycleName ? t('reports.cycleAnalysisFor', { name: cycleName }) : t('reports.cycleAnalysis')}
                </Text>
                {/* The report a farmer is looking at is the one they want to
                    send, so the export starts pre-filled with this cycle. */}
                {exportOn ? (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Export', { dataset: 'cycle', cropId: cycleId })}
                        style={styles.backBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('export.title')}
                    >
                        <MaterialCommunityIcons name="share-variant" size={22} color={c.primary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backBtn} />
                )}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : !data ? (
                <EmptyState icon="chart-line" title={t('reports.noAnalysisTitle')} subtitle={t('reports.noAnalysisSub')} />
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.grid}>
                        {metrics.map((m) => (
                            <Card key={m.label} style={styles.metricCard}>
                                <Text style={styles.metricValue}>{m.value}</Text>
                                <Text style={styles.metricLabel}>{m.label}</Text>
                            </Card>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>{t('reports.growthCurve')}</Text>
                    {growth.length >= 2 ? (
                        <Card style={styles.chartCard}>
                            <LineChart
                                data={{
                                    labels: growth.map((g) => g.date.slice(5)), // MM-DD
                                    datasets: [{ data: growth.map((g) => g.mbw) }],
                                }}
                            />
                        </Card>
                    ) : (
                        <Card style={styles.chartCard}>
                            <Text style={styles.hint}>{t('reports.growthNeedsData')}</Text>
                        </Card>
                    )}
                </ScrollView>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: theme.spacing[4], borderBottomWidth: 1, borderBottomColor: c.borderDefault, backgroundColor: c.surface,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: c.textPrimary, flex: 1, textAlign: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4], marginBottom: theme.spacing[6] },
    metricCard: { width: '47%', padding: theme.spacing[4], alignItems: 'center' },
    metricValue: { ...theme.typeScale.numericMedium, color: c.textPrimary },
    metricLabel: { ...theme.typeScale.labelSmall, color: c.textSecondary, marginTop: 4, textAlign: 'center' },
    sectionTitle: { ...theme.typeScale.h4, color: c.textPrimary, marginBottom: theme.spacing[3] },
    chartCard: { padding: theme.spacing[3] },
    hint: { ...theme.typeScale.bodyMedium, color: c.textSecondary, textAlign: 'center', padding: theme.spacing[4] },
});

export default CycleAnalysisScreen;
