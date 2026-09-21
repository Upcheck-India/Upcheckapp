import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { StaleNotice } from '../../components/ui/CacheNotice';
import { LineChart } from '../../components/charts/LineChart';
import { theme } from '../../theme';
import { feedApi, type FeedRecord } from '../../api/feedRecords';
import { inventoryApi } from '../../api/inventory';
import { pondContextApi, type PondContext } from '../../api/pondContext';

const timeAgo = (iso?: string | null): string => {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.max(0, Math.floor(ms / 60000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Group feed records into daily totals (kg/day), oldest→newest, last `n` days.
const dailySeries = (records: FeedRecord[], n = 10) => {
  const byDay = new Map<string, number>();
  for (const r of records) {
    if (!r.recordedAt) continue;
    const d = new Date(r.recordedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay.set(key, (byDay.get(key) ?? 0) + (Number(r.quantityKg) || 0));
  }
  const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-n);
  return {
    labels: sorted.map(([k]) => k.slice(5).replace('-', '/')), // MM/DD
    values: sorted.map(([, v]) => Math.round(v * 10) / 10),
  };
};

export const FeedStatsScreen = ({ route }: any) => {
  const { t } = useTranslation();
  const { pondId, pondName, cropId, farmId } = route.params ?? {};

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [ctx, setCtx] = useState<PondContext | null>(null);
  const [totalKg, setTotalKg] = useState<number | null>(null);
  const [feedStockKg, setFeedStockKg] = useState<number | null>(null);
  const [feedLowStock, setFeedLowStock] = useState(false);
  /** At least one read has come back, so the figures on screen are real. */
  const [loadedOnce, setLoadedOnce] = useState(false);
  /** The latest refresh had a read fail; what is shown is the previous copy. */
  const [failed, setFailed] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  // Refetch on FOCUS, not on mount. React Navigation keeps a screen mounted
  // once opened, so a mount-only effect never ran again: log a feed, come
  // back here, and the totals were still the pre-log ones.
  //
  // Each read is settled on its own. A failed one keeps its PREVIOUS value
  // rather than becoming [] / 0 — "0 kg in stock" or "no feed logged" for a
  // read that simply timed out is a wrong answer, not a missing one.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // feedApi.getAll/getByCrop return a paginated PageDto ({ data, meta }), not
        // a bare array — unwrap it the same way FeedHistoryScreen does. Postgres
        // numeric columns (quantityKg, inventory quantity) also come back as
        // strings, so every arithmetic use below needs a Number() coercion.
        const toRecords = (data: any): FeedRecord[] => (Array.isArray(data) ? data : data?.data || []);

        const [recRes, ctxRes, totalRes, invRes] = await Promise.allSettled([
          feedApi.getAll(pondId, { take: 100 }).then((r) => toRecords(r.data)),
          pondContextApi.get(pondId).then((r) => r.data),
          cropId
            ? feedApi.getByCrop(cropId, { take: 100 }).then((r) => toRecords(r.data).reduce((s, x) => s + (Number(x.quantityKg) || 0), 0))
            : feedApi.getTotalByPond(pondId).then((r) => Number(r.data)),
          farmId ? inventoryApi.getAll(farmId).then((r) => r.data) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const all = [recRes, ctxRes, totalRes, invRes];
        if (recRes.status === 'fulfilled') {
          setRecords([...recRes.value].sort((a, b) => Date.parse(b.recordedAt || '') - Date.parse(a.recordedAt || '')));
        }
        if (ctxRes.status === 'fulfilled') setCtx(ctxRes.value);
        if (totalRes.status === 'fulfilled') {
          setTotalKg(!Number.isNaN(totalRes.value) ? totalRes.value : null);
        }
        if (invRes.status === 'fulfilled') {
          const feedItems = invRes.value.filter((i) => i.category?.toLowerCase().includes('feed'));
          setFeedStockKg(feedItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0));
          setFeedLowStock(feedItems.some((i) => i.reorderLevel != null && Number(i.quantity) <= Number(i.reorderLevel)));
        }
        if (all.some((r) => r.status === 'fulfilled')) setLoadedOnce(true);
        const rejected = all.find((r): r is PromiseRejectedResult => r.status === 'rejected');
        setFailed(rejected ? rejected.reason ?? new Error('failed') : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pondId, cropId, farmId, attempt]));

  const last = records[0] ?? null;
  const series = dailySeries(records);

  return (
    <ScreenWrapper>
      <View style={styles.head}>
        <MaterialCommunityIcons name="silo" size={26} color={theme.roles.light.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('feedStats.title')}</Text>
          {pondName ? <Text style={styles.subtitle}>{pondName}</Text> : null}
        </View>
      </View>

      {loading && !loadedOnce ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.roles.light.primary} />
        </View>
      ) : failed && !loadedOnce ? (
        <ErrorState error={failed} onRetry={() => setAttempt((n) => n + 1)} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <StaleNotice visible={!!failed} />
          {/* Inventory remaining banner */}
          {feedStockKg != null && (
            <Card
              style={[
                styles.stockBanner,
                feedLowStock && { borderColor: theme.roles.light.dangerBorder, borderWidth: 1 },
              ]}
            >
              <MaterialCommunityIcons
                name="warehouse"
                size={22}
                color={feedLowStock ? theme.roles.light.dangerText : theme.roles.light.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stockLabel}>{t('feedStats.inStock')}</Text>
                <Text style={[styles.stockValue, feedLowStock && { color: theme.roles.light.dangerText }]}>
                  {Math.round(feedStockKg)} {t('feedStats.kg')}
                </Text>
              </View>
              {feedLowStock && (
                <View style={styles.lowPill}>
                  <Text style={styles.lowPillText}>{t('feedStats.lowStock')}</Text>
                </View>
              )}
            </Card>
          )}

          {/* Metric row */}
          <View style={styles.metricRow}>
            <Metric
              label={t('feedStats.lastFed')}
              value={last?.quantityKg != null ? `${last.quantityKg}` : '—'}
              unit={t('feedStats.kg')}
              sub={timeAgo(last?.recordedAt)}
            />
            <Metric
              label={t('feedStats.totalFed')}
              value={totalKg != null ? `${Math.round(totalKg)}` : '—'}
              unit={t('feedStats.kg')}
              sub={cropId ? t('feedStats.thisCrop') : t('feedStats.thisPond')}
            />
            <Metric
              label={t('feedStats.fcr')}
              value={ctx?.runningFcr != null ? ctx.runningFcr.toFixed(2) : '—'}
              sub={t('feedStats.runningFcr')}
            />
          </View>

          {/* Consumption chart */}
          <Text style={styles.sectionLabel}>{t('feedStats.consumption')}</Text>
          <Card style={styles.chartCard}>
            {series.values.length >= 2 ? (
              <LineChart
                data={{ labels: series.labels, datasets: [{ data: series.values }] }}
                yAxisSuffix={t('feedStats.kg')}
                width={Dimensions.get('window').width - 64}
                height={200}
              />
            ) : (
              <Text style={styles.empty}>{t('feedStats.notEnoughData')}</Text>
            )}
          </Card>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

const Metric = ({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) => (
  <Card style={styles.metricCard}>
    <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    <View style={styles.metricValueRow}>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
      {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
    </View>
    {sub ? <Text style={styles.metricSub} numberOfLines={1}>{sub}</Text> : null}
  </Card>
);

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] },
  title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
  subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
  loading: { paddingVertical: theme.spacing[8], alignItems: 'center' },
  stockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  stockLabel: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary },
  stockValue: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
  lowPill: {
    backgroundColor: theme.roles.light.dangerBg,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  lowPillText: { ...theme.typeScale.labelSmall, color: theme.roles.light.dangerText, fontWeight: '700' },
  metricRow: { flexDirection: 'row', gap: theme.spacing[3], marginBottom: theme.spacing[5] },
  metricCard: { flex: 1, padding: theme.spacing[3], alignItems: 'flex-start' },
  metricLabel: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: theme.spacing[1] },
  metricValue: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
  metricUnit: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary },
  metricSub: { ...theme.typeScale.caption, color: theme.roles.light.textTertiary, marginTop: 2 },
  sectionLabel: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[3] },
  chartCard: { padding: theme.spacing[3], alignItems: 'center', marginBottom: theme.spacing[6] },
  empty: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textTertiary, paddingVertical: theme.spacing[6] },
});

export default FeedStatsScreen;
