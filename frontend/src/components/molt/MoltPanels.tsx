/**
 * Molt window panels for the Lunar screen: the window timeline, a pond's
 * checklist (with pondId), or every pond's progress (without).
 *
 * Everything is server-derived: windows from `/molt/windows` (true phase, IST),
 * checklist status from the pond's own logs (`/molt/ponds/:id`). A log saved
 * anywhere invalidates ['pond'] / ['briefing'], which these keys sit under, so
 * returning from "Log it" shows the item done without a manual refresh.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { theme } from '../../theme';
import { formatDate } from '../../utils/formatDate';
import { useAppQuery, useRefetchOnFocus } from '../../query/hooks';
import { queryClient } from '../../query/client';
import { moltApi, type MoltItem, type PondMolt } from '../../api/molt';
import { apiErrorMessage } from '../../api/errors';
import { useMoltWindows } from './MoltPeakBanner';
import { addDays, istDateString, windowContaining, type MoltWindow } from '../../features/moltWindow';

const c = theme.roles.light;
const day = (d: string) => formatDate(`${d}T12:00:00`);
const range = (t: any, a: string, b: string) => t('engines.lunar.dateRange', { start: day(a), end: day(b) });


export const MoltTimeline: React.FC = () => {
  const { t } = useTranslation();
  const { data: windows } = useMoltWindows();
  if (!windows?.length) return null;
  const today = istDateString(new Date());
  const current = windowContaining(windows, today);
  const shown: MoltWindow = current?.window ?? windows[0];
  const segments = [
    { phase: 'pre', start: shown.preStart, end: addDays(shown.peakStart, -1) },
    { phase: 'peak', start: shown.peakStart, end: shown.peakEnd },
    { phase: 'post', start: addDays(shown.peakEnd, 1), end: shown.postEnd },
  ] as const;

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionLabel}>{t('engines.lunar.timeline')}</Text>
      <Text style={styles.windowName}>
        {t(shown.kind === 'new' ? 'engines.lunar.windowNew' : 'engines.lunar.windowFull', { date: day(shown.peakDate) })}
      </Text>
      <View style={styles.segments}>
        {segments.map((s) => {
          const active = current?.phase === s.phase;
          return (
            <View
              key={s.phase}
              style={[styles.segment, s.phase === 'peak' && styles.segmentPeak, active && styles.segmentActive]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>{t(`engines.lunar.phase_${s.phase}`)}</Text>
              <Text style={[styles.segDates, active && styles.segLabelActive]}>{range(t, s.start, s.end)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.sectionLabelTop}>{t('engines.lunar.nextWindows')}</Text>
      {windows.map((w) => (
        <Text key={w.key} style={styles.nextRow}>
          {t(w.kind === 'new' ? 'engines.lunar.windowNew' : 'engines.lunar.windowFull', { date: day(w.peakDate) })}
          {' · '}
          {range(t, w.preStart, w.postEnd)}
        </Text>
      ))}
    </Card>
  );
};

const STATUS_ICON: Record<MoltItem['status'], { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  done: { name: 'check-circle', color: c.successText ?? c.primary },
  pending: { name: 'checkbox-blank-circle-outline', color: c.textTertiary },
  violated: { name: 'alert-circle', color: c.dangerText },
  missed: { name: 'minus-circle-outline', color: c.textTertiary },
};

export const MoltChecklist: React.FC<{ pondId: string; pondName?: string; cropId?: string | null; canWrite?: boolean }> = ({
  pondId,
  pondName,
  cropId,
  canWrite = true,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const key = ['pond', 'molt', pondId];
  useRefetchOnFocus(key);
  const { data: pm } = useAppQuery<PondMolt>({
    queryKey: key,
    queryFn: () => moltApi.pond(pondId).then((r) => r.data),
  });
  const [saving, setSaving] = React.useState<string | null>(null);
  if (!pm) return null;

  const toggle = async (item: MoltItem) => {
    if (!pm.window) return;
    setSaving(item.key);
    try {
      const done = item.status !== 'done';
      const res = await moltApi.setAction(pondId, { windowKey: pm.window.key, actionKey: item.key, done });
      // Queued offline: show the tick now; it syncs on reconnect.
      queryClient.setQueryData<PondMolt>(key, (old) =>
        res.data ??
        (old && {
          ...old,
          items: old.items.map((i) =>
            i.key === item.key ? { ...i, status: done ? 'done' : 'pending', source: 'manual' } : i,
          ),
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['briefing'] });
    } catch (e) {
      Alert.alert(t('engines.common.couldNotCompute'), apiErrorMessage(e, t('engines.common.tryAgain')));
    } finally {
      setSaving(null);
    }
  };

  const params = { pondId, pondName, cropId: cropId ?? undefined };
  let body: React.ReactNode;
  if (pm.sizeUnknown) {
    body = (
      <>
        <Text style={styles.note}>{t('engines.lunar.sizeUnknown')}</Text>
        {canWrite && (
          <Button title={t('engines.lunar.sample')} variant="outlined" onPress={() => navigation.navigate('SamplingLog', params)} />
        )}
      </>
    );
  } else if (!pm.eligible) {
    body = <Text style={styles.note}>{t('engines.lunar.tooSmall')}</Text>;
  } else if (!pm.window) {
    body = <Text style={styles.note}>{t('engines.lunar.noWindowNow')}</Text>;
  } else {
    // Items whose days are over are history: no buttons, below a divider.
    // `actionable` is undefined on an older backend, which means "still doable".
    const renderItem = (item: MoltItem) => {
      const icon = STATUS_ICON[item.status];
      const live = item.actionable !== false;
      const missed = item.status === 'missed';
      // A chemical/treatment log needs the cycle; opened before the pond
      // context loads it would save against no crop and never satisfy the item.
      const blocked = (item.route === 'ChemicalLog' || item.route === 'TreatmentLog') && !cropId;
      // Auto + manual items (minerals) offer both "Log it" and "Mark done".
      const canLog = item.status === 'pending' && !!item.route;
      return (
        <View key={item.key} style={[styles.itemRow, missed && styles.itemMissed]} testID={`molt-item-${item.key}`}>
          <MaterialCommunityIcons name={icon.name} size={22} color={icon.color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.itemText, missed && { color: c.textTertiary }]}>{t(`engines.lunar.item_${item.key}`)}</Text>
            <Text style={[styles.itemMeta, item.status === 'violated' && { color: c.dangerText }]}>
              {t(`engines.lunar.priority_${item.priority}`)} · {t(`engines.lunar.status_${item.status}`)}
            </Text>
          </View>
          {live && canWrite && item.source === 'manual' && (
            <TouchableOpacity
              style={styles.itemBtn}
              onPress={() => toggle(item)}
              disabled={saving === item.key}
              accessibilityRole="button"
            >
              <Text style={styles.itemBtnLabel}>
                {item.status === 'done' ? t('engines.lunar.undo') : t('engines.lunar.markDone')}
              </Text>
            </TouchableOpacity>
          )}
          {live && canWrite && canLog && (
            <TouchableOpacity
              style={[styles.itemBtn, blocked && { opacity: 0.4 }]}
              // A treatment from the checklist is a mineral molt-prep dose (D2 prefill).
              onPress={() => navigation.navigate(item.route!, item.route === 'TreatmentLog' ? { ...params, prefill: 'molt' } : params)}
              disabled={blocked}
              accessibilityRole="button"
              accessibilityState={{ disabled: blocked }}
            >
              <Text style={styles.itemBtnLabel}>{t('engines.lunar.logIt')}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    };
    // Not doable AND its days have started: over. (A not-yet-open step stays in
    // the main list, still without buttons.)
    const today = istDateString(new Date());
    const isEarlier = (i: MoltItem) => i.actionable === false && !(i.actionableFrom && i.actionableFrom > today);
    const current = pm.items.filter((i) => !isEarlier(i));
    const earlier = pm.items.filter(isEarlier);
    body = (
      <>
        {current.map(renderItem)}
        {earlier.length > 0 && <Text style={styles.sectionLabelTop}>{t('engines.lunar.earlierInWindow')}</Text>}
        {earlier.map(renderItem)}
      </>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionLabel}>{t('engines.lunar.checklist')}</Text>
      {body}
    </Card>
  );
};

export const MoltPondList: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const key = ['briefing', 'molt', 'ponds'];
  useRefetchOnFocus(key);
  const { data: ponds } = useAppQuery({
    queryKey: key,
    queryFn: () => moltApi.ponds().then((r) => r.data),
  });
  if (!ponds) return null;
  const listed = ponds.filter((p) => p.eligible || p.sizeUnknown);

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionLabel}>{t('engines.lunar.eligiblePonds')}</Text>
      {listed.length === 0 && <Text style={styles.note}>{t('engines.lunar.noEligiblePonds')}</Text>}
      {listed.map((p) => (
        <TouchableOpacity
          key={p.pondId}
          style={styles.itemRow}
          onPress={() => navigation.push('Lunar', { pondId: p.pondId, pondName: p.pondName })}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name={p.needsAction ? 'alert-circle-outline' : 'check-circle-outline'}
            size={22}
            color={p.pendingCritical > 0 ? c.dangerText : p.needsAction ? c.warningText : c.textTertiary}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.itemText}>{p.pondName}</Text>
            <Text style={styles.itemMeta}>
              {p.sizeUnknown
                ? t('engines.lunar.needsSampling')
                : t('engines.lunar.pondProgress', { done: p.done, total: p.total })}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={c.textTertiary} />
        </TouchableOpacity>
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing[4], padding: theme.spacing[4] },
  sectionLabel: { ...theme.typeScale.overline, color: c.textTertiary, marginBottom: theme.spacing[3] },
  sectionLabelTop: { ...theme.typeScale.overline, color: c.textTertiary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  windowName: { ...theme.typeScale.bodyMedium, color: c.textPrimary, marginBottom: theme.spacing[2] },
  segments: { flexDirection: 'row', gap: theme.spacing[2] },
  segment: {
    flex: 1,
    padding: theme.spacing[2],
    borderRadius: theme.radius.md,
    backgroundColor: c.surfaceVariant,
  },
  segmentPeak: { backgroundColor: c.warningBg },
  segmentActive: { backgroundColor: c.primary },
  segLabel: { ...theme.typeScale.caption, fontWeight: '700', color: c.textPrimary },
  segDates: { ...theme.typeScale.caption, color: c.textSecondary },
  segLabelActive: { color: c.textInverse },
  nextRow: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginBottom: theme.spacing[1] },
  note: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginBottom: theme.spacing[2] },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[2] },
  itemText: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
  itemMissed: { opacity: 0.6 },
  itemMeta: { ...theme.typeScale.caption, color: c.textTertiary },
  itemBtn: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: c.primary,
  },
  itemBtnLabel: { ...theme.typeScale.labelMedium, color: c.primary },
});
