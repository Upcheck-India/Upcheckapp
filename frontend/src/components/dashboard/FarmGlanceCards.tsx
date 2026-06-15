import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import { pondsApi } from '../../api/ponds';
import { pondContextApi, type PondContext } from '../../api/pondContext';
import { feedApi } from '../../api/feedRecords';
import { inventoryApi } from '../../api/inventory';
import { transactionsApi, type TransactionSummary } from '../../api/transactions';
import { pnlApi, type CropPnl } from '../../api/pnl';

// Compact ₹ formatter for narrow cards (₹1.2L / ₹95k / ₹420).
const inr = (n: number): string => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}k`;
  return `${s}₹${Math.round(a)}`;
};

const timeAgo = (iso?: string | null): string => {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Cost-breakdown segment palette (cycled).
const SEGMENT_COLORS = [
  theme.roles.light.primary,
  theme.roles.light.warningText,
  theme.roles.light.infoText,
  theme.roles.light.successText,
  theme.roles.light.dangerText,
  theme.roles.light.textTertiary,
];

interface ChosenPond {
  id: string;
  name: string;
  cropId: string | null;
  ctx: PondContext;
}

interface GlanceData {
  chosen: ChosenPond | null;
  lastFeedKg: number | null;
  lastFeedAt: string | null;
  feedStockKg: number;
  feedLowStock: boolean;
  tx: TransactionSummary | null;
  pnl: CropPnl | null;
}

const recencyOf = (c: PondContext): number => {
  const w = c.waterQuality?.recordedAt ? Date.parse(c.waterQuality.recordedAt) : 0;
  const f = c.lastFeedAt ? Date.parse(c.lastFeedAt) : 0;
  return Math.max(w || 0, f || 0);
};

interface Props {
  farmId: string;
  farmName?: string;
  navigation: any;
}

export const FarmGlanceCards: React.FC<Props> = ({ farmId, farmName, navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GlanceData | null>(null);

  // Root-stack screens live above the tab navigator — navigate via the parent.
  const goRoot = (screen: string, params?: any) =>
    navigation.getParent()?.navigate(screen, params) ?? navigation.navigate(screen, params);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ponds = (await pondsApi.getMine()).data.filter((p) => p.farmId === farmId);
        const active = ponds.filter((p) => p.activeCycleId);

        // Fan out over active ponds (capped) to find the most recently active one.
        const ctxs = (
          await Promise.all(
            active.slice(0, 8).map((p) =>
              pondContextApi
                .get(p.id)
                .then((r) => ({ pond: p, ctx: r.data }))
                .catch(() => null),
            ),
          )
        ).filter(Boolean) as { pond: (typeof active)[number]; ctx: PondContext }[];

        const best = ctxs.length
          ? ctxs.reduce((a, b) => (recencyOf(b.ctx) > recencyOf(a.ctx) ? b : a))
          : null;
        const chosen: ChosenPond | null = best
          ? { id: best.pond.id, name: best.pond.displayName || best.pond.name, cropId: best.ctx.cropId, ctx: best.ctx }
          : null;

        const [lastFeed, inv, tx, pnl] = await Promise.all([
          chosen
            ? feedApi
                .getAll(chosen.id)
                .then((r) =>
                  [...r.data].sort(
                    (a, b) => Date.parse(b.recordedAt || '') - Date.parse(a.recordedAt || ''),
                  )[0] ?? null,
                )
                .catch(() => null)
            : Promise.resolve(null),
          inventoryApi.getAll(farmId).then((r) => r.data).catch(() => []),
          transactionsApi.getSummary(farmId).then((r) => r.data).catch(() => null),
          chosen?.cropId
            ? pnlApi.cropPnl(chosen.cropId).then((r) => r.data).catch(() => null)
            : Promise.resolve(null),
        ]);

        const feedItems = inv.filter((i) => i.category?.toLowerCase().includes('feed'));
        const feedStockKg = feedItems.reduce((s, i) => s + (i.quantity || 0), 0);
        const feedLowStock = feedItems.some(
          (i) => i.reorderLevel != null && i.quantity <= i.reorderLevel,
        );

        if (!cancelled) {
          setData({
            chosen,
            lastFeedKg: lastFeed?.quantityKg ?? null,
            lastFeedAt: lastFeed?.recordedAt ?? chosen?.ctx.lastFeedAt ?? null,
            feedStockKg,
            feedLowStock,
            tx,
            pnl,
          });
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.roles.light.primary} />
      </View>
    );
  }
  if (!data) return null;

  const wq = data.chosen?.ctx.waterQuality ?? null;
  const doVal = wq?.dissolvedOxygen;
  const doStatus =
    doVal == null
      ? theme.roles.light.textPrimary
      : doVal < 3
        ? theme.roles.light.dangerText
        : doVal < 4
          ? theme.roles.light.warningText
          : theme.roles.light.successText;

  return (
    <View style={styles.grid}>
      {/* ── Water Quality → Farm screen ───────────────────────────── */}
      <TouchableOpacity
        style={styles.cell}
        activeOpacity={0.85}
        onPress={() => goRoot('FarmDetail', { farmId, farmName })}
      >
        <Card style={styles.card}>
          <CardHeader icon="water-percent" title={t('home.waterQuality')} pond={data.chosen?.name} />
          {wq ? (
            <>
              <View style={styles.bigRow}>
                <Text style={[styles.bigValue, { color: doStatus }]}>{doVal ?? '—'}</Text>
                <Text style={styles.bigUnit}>{t('home.doUnit')}</Text>
              </View>
              <Text style={styles.subMeta} numberOfLines={1}>
                {[
                  wq.ph != null ? `pH ${wq.ph}` : null,
                  wq.temperature != null ? `${wq.temperature}°C` : null,
                  wq.salinity != null ? `${wq.salinity}ppt` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || t('home.noReadings')}
              </Text>
              <Text style={styles.foot}>{timeAgo(wq.recordedAt)}</Text>
            </>
          ) : (
            <Text style={styles.empty}>{t('home.noReadings')}</Text>
          )}
        </Card>
      </TouchableOpacity>

      {/* ── Last Feed → Feed Statistics ───────────────────────────── */}
      <TouchableOpacity
        style={styles.cell}
        activeOpacity={0.85}
        onPress={() =>
          goRoot('FeedStats', {
            pondId: data.chosen?.id,
            pondName: data.chosen?.name,
            cropId: data.chosen?.cropId ?? undefined,
            farmId,
          })
        }
        disabled={!data.chosen}
      >
        <Card style={styles.card}>
          <CardHeader icon="silo" title={t('home.lastFeed')} pond={data.chosen?.name} />
          <View style={styles.bigRow}>
            <Text style={styles.bigValue}>{data.lastFeedKg != null ? data.lastFeedKg : '—'}</Text>
            <Text style={styles.bigUnit}>{t('home.kg')}</Text>
          </View>
          <Text style={styles.subMeta}>{timeAgo(data.lastFeedAt)}</Text>
          <View style={styles.stockRow}>
            <MaterialCommunityIcons
              name="warehouse"
              size={13}
              color={data.feedLowStock ? theme.roles.light.dangerText : theme.roles.light.textSecondary}
            />
            <Text
              style={[styles.foot, data.feedLowStock && { color: theme.roles.light.dangerText }]}
              numberOfLines={1}
            >
              {t('home.inStock', { kg: Math.round(data.feedStockKg) })}
              {data.feedLowStock ? ` · ${t('home.low')}` : ''}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>

      {/* ── Expense tracker → Transactions ────────────────────────── */}
      <TouchableOpacity
        style={styles.cell}
        activeOpacity={0.85}
        onPress={() => goRoot('Transactions', { farmId, farmName })}
      >
        <Card style={styles.card}>
          <CardHeader icon="cash-multiple" title={t('home.expenses')} />
          <View style={styles.bigRow}>
            <Text style={styles.bigValue}>{data.tx ? inr(data.tx.totalExpense) : '—'}</Text>
          </View>
          {data.tx && (
            <View style={styles.stockRow}>
              <MaterialCommunityIcons
                name={data.tx.netProfit >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={data.tx.netProfit >= 0 ? theme.roles.light.successText : theme.roles.light.dangerText}
              />
              <Text
                style={[
                  styles.subMeta,
                  { color: data.tx.netProfit >= 0 ? theme.roles.light.successText : theme.roles.light.dangerText },
                ]}
              >
                {t('home.net', { amount: inr(data.tx.netProfit) })}
              </Text>
            </View>
          )}
          <Text style={styles.foot}>{t('home.tapToManage')}</Text>
        </Card>
      </TouchableOpacity>

      {/* ── Crop P&L → Crop P&L screen ────────────────────────────── */}
      <TouchableOpacity
        style={styles.cell}
        activeOpacity={0.85}
        onPress={() =>
          goRoot('CropPnl', {
            cropId: data.chosen?.cropId ?? undefined,
            pondId: data.chosen?.id,
            pondName: data.chosen?.name,
          })
        }
        disabled={!data.pnl}
      >
        <Card style={styles.card}>
          <CardHeader icon="chart-line" title={t('home.cropPnl')} pond={data.chosen?.name} />
          {data.pnl ? (
            <>
              <View style={styles.bigRow}>
                <Text
                  style={[
                    styles.bigValue,
                    { color: data.pnl.profit >= 0 ? theme.roles.light.successText : theme.roles.light.dangerText },
                  ]}
                >
                  {inr(data.pnl.profit)}
                </Text>
              </View>
              <Text style={styles.subMeta} numberOfLines={1}>
                {t('home.marginRoi', {
                  margin: Math.round(data.pnl.marginPct),
                  roi: Math.round(data.pnl.roiPct),
                })}
              </Text>
              <CostBar breakdown={data.pnl.costBreakdown} />
            </>
          ) : (
            <Text style={styles.empty}>{t('home.noActiveCrop')}</Text>
          )}
        </Card>
      </TouchableOpacity>
    </View>
  );
};

const CardHeader = ({
  icon,
  title,
  pond,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  pond?: string;
}) => (
  <View style={styles.header}>
    <MaterialCommunityIcons name={icon} size={18} color={theme.roles.light.primary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {pond ? <Text style={styles.pond} numberOfLines={1}>{pond}</Text> : null}
    </View>
    <MaterialCommunityIcons name="chevron-right" size={18} color={theme.roles.light.textTertiary} />
  </View>
);

// Slim horizontal stacked bar of cost-by-category (the "graph" on the P&L card).
const CostBar = ({ breakdown }: { breakdown: Record<string, number> }) => {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return null;
  return (
    <View style={styles.costBar}>
      {entries.map(([cat, v], i) => (
        <View
          key={cat}
          style={{
            flex: v / total,
            backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  loading: { paddingVertical: theme.spacing[6], alignItems: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[6],
  },
  cell: { width: '47%', flexGrow: 1 },
  card: { padding: theme.spacing[4], minHeight: 132 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[3] },
  title: { ...theme.typeScale.labelMedium, color: theme.roles.light.textPrimary, fontWeight: '600' },
  pond: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[1] },
  bigValue: { ...theme.typeScale.numericLarge, color: theme.roles.light.textPrimary },
  bigUnit: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
  subMeta: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: 2 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], marginTop: theme.spacing[2] },
  foot: { ...theme.typeScale.caption, color: theme.roles.light.textTertiary, marginTop: theme.spacing[2] },
  empty: { ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary, marginTop: theme.spacing[2] },
  costBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: theme.spacing[3],
    backgroundColor: theme.roles.light.surfaceVariant,
  },
});
