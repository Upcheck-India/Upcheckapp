/**
 * MorningBriefingScreen — the unified Alert Center's daily card. One row per
 * pond showing its highest-priority action, ordered by severity.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SeverityPill, type Severity } from '../../components/ui/SeverityPill';
import { theme } from '../../theme';
import { alertCenterApi, type BriefingItem } from '../../api/alertCenter';

const sevMap = (s: string): Severity => (s === 'critical' ? 'critical' : s === 'watch' ? 'watch' : 'info');
const sevRank = (s: string) => (s === 'critical' ? 3 : s === 'watch' ? 2 : 1);

/** One card per pond — keep the highest-severity item, sum the alert counts. */
const mergeByPond = (items: BriefingItem[]): BriefingItem[] => {
  const byPond = new Map<string, BriefingItem>();
  for (const it of items) {
    const key = it.pondId ?? 'farm';
    const cur = byPond.get(key);
    if (!cur) {
      byPond.set(key, { ...it });
    } else {
      const top = sevRank(it.topSeverity) > sevRank(cur.topSeverity) ? it : cur;
      byPond.set(key, { ...top, alertCount: cur.alertCount + it.alertCount });
    }
  }
  return [...byPond.values()].sort((a, b) => sevRank(b.topSeverity) - sevRank(a.topSeverity));
};
const sourceIcon: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  feed: 'silo-outline',
  disease: 'shield-alert-outline',
  lunar: 'moon-waning-crescent',
  harvest: 'calendar-clock',
  aeration: 'fan',
  weather: 'weather-lightning-rainy',
};

export const MorningBriefingScreen = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<BriefingItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Live engine alerts (recomputed from latest data) + persisted alerts,
      // merged to one card per pond keeping the highest severity.
      const [live, persisted] = await Promise.all([
        alertCenterApi.liveBriefing().catch(() => ({ data: [] as BriefingItem[] })),
        alertCenterApi.briefing().catch(() => ({ data: [] as BriefingItem[] })),
      ]);
      setItems(mergeByPond([...live.data, ...persisted.data]));
    } catch {
      setItems([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScreenWrapper>
      <View style={styles.head}>
        <MaterialCommunityIcons name="weather-sunset-up" size={26} color={theme.roles.light.primary} />
        <Text style={styles.title}>{t('engines.briefing.title')}</Text>
      </View>

      {items === null ? (
        <ActivityIndicator color={theme.roles.light.primary} style={{ marginTop: theme.spacing[8] }} />
      ) : items.length === 0 ? (
        <EmptyState icon="check-circle-outline" title={t('engines.briefing.allClear')} subtitle={t('engines.briefing.allClearSub')} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {items.map((it, i) => (
            <Card key={i} style={[styles.card, { borderLeftColor: barColor(it.topSeverity) }]}>
              <View style={styles.cardHead}>
                <MaterialCommunityIcons
                  name={sourceIcon[it.source] ?? 'bell-outline'}
                  size={20}
                  color={theme.roles.light.textSecondary}
                />
                <Text style={styles.pond}>{it.pondId ? t('engines.briefing.pond', { id: it.pondId.slice(0, 8) }) : t('engines.briefing.farm')}</Text>
                <SeverityPill severity={sevMap(it.topSeverity)} label={it.topSeverity} />
              </View>
              <Text style={styles.action}>{it.topTitle}</Text>
              {it.steps.slice(0, 2).map((s, j) => (
                <View key={j} style={styles.step}>
                  <MaterialCommunityIcons name="arrow-right-thin" size={16} color={theme.roles.light.primary} />
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
              {it.alertCount > 1 && (
                <Text style={styles.more}>
                  {t(it.alertCount > 2 ? 'engines.briefing.moreAlerts' : 'engines.briefing.moreAlert', { count: it.alertCount - 1 })}
                </Text>
              )}
            </Card>
          ))}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

const barColor = (s: string) =>
  s === 'critical' ? theme.roles.light.dangerBorder : s === 'watch' ? theme.roles.light.warningBorder : theme.roles.light.infoBorder;

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] },
  title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
  card: { marginBottom: theme.spacing[3], padding: theme.spacing[4], borderLeftWidth: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] },
  pond: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary, flex: 1 },
  action: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[2] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[1] },
  stepText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textPrimary, flex: 1 },
  more: { ...theme.typeScale.caption, color: theme.roles.light.textTertiary, marginTop: theme.spacing[2] },
});

export default MorningBriefingScreen;
