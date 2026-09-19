/**
 * DiseaseRiskScreen — Disease Early-Warning read-out (disease spec D7).
 *
 * Nothing to tick: the server derives every sign from the pond's own logs and
 * says how much it knew ("based on 9 of 23 signs"). The farmer improves it by
 * logging what they see (the D6 health check). Opening the screen saves the
 * day's snapshot server-side, so outcomes can calibrate the weights later.
 */
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeverityPill, type Severity } from '../../components/ui/SeverityPill';
import { EngineUnavailable } from '../../components/ui/EngineUnavailable';
import { theme } from '../../theme';
import { diseaseWarningApi, type CurrentDiseaseRisk, type DiseaseRisk } from '../../api/diseaseWarning';
import type { TextKey } from '../../api/alertCenter';

const bandSeverity = (band: string): Severity =>
  band === 'Critical' ? 'critical' : band === 'Watch' ? 'watch' : 'low';

export const DiseaseRiskScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { pondId, pondName } = route.params ?? {};
  const [data, setData] = useState<CurrentDiseaseRisk | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // A key the app knows, else the backend's English.
  const tk = (k: TextKey | undefined, english: string) =>
    (k && (t(k.key, { ...k.params, defaultValue: '' }) as string)) || english;

  const load = useCallback(async () => {
    if (!pondId) return;
    setLoading(true);
    setFailed(false);
    try {
      const { data: d } = await diseaseWarningApi.current(pondId);
      setData(d);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [pondId]);

  // On FOCUS, not mount: a health check logged from here must show on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const risks = data?.risks ?? [];
  const top = risks[0];
  const name = (r: DiseaseRisk) => t(`engines.disease.name_${r.disease}`, { defaultValue: r.disease });
  const band = (r: DiseaseRisk) => t(`engines.disease.band_${r.band}`, { defaultValue: r.band });

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <MaterialCommunityIcons name="shield-alert-outline" size={26} color={theme.roles.light.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('engines.disease.title')}</Text>
            {pondName ? <Text style={styles.subtitle}>{pondName}</Text> : null}
          </View>
        </View>

        {!pondId ? <Text style={styles.note}>{t('engines.disease.noPond')}</Text> : null}
        {failed ? <EngineUnavailable onRetry={load} /> : null}
        {loading && !data ? <ActivityIndicator color={theme.roles.light.primary} /> : null}

        {data ? (
          <Card style={styles.card}>
            <Text style={styles.note}>{t('engines.disease.intro')}</Text>
            <Text style={styles.coverage}>
              {t('engines.disease.coverage', { known: data.coverage.known, total: data.coverage.total })}
            </Text>
            <Button
              title={t('engines.disease.addWhatYouSee')}
              onPress={() => navigation.navigate('HealthCheck', { pondId, pondName })}
              style={styles.cta}
            />
          </Card>
        ) : null}

        {top ? (
          <Card style={[styles.card, styles.topCard, { borderLeftColor: bandColor(top.band) }]}>
            <Text style={styles.sectionLabel}>{t('engines.disease.highestRisk')}</Text>
            <View style={styles.topRow}>
              <Text style={styles.topName} numberOfLines={2}>{name(top)}</Text>
              <SeverityPill severity={bandSeverity(top.band)} label={band(top)} />
            </View>
          </Card>
        ) : null}

        {risks.length ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('engines.disease.allRanked')}</Text>
            {risks.map((r) => (
              <View key={r.disease} style={styles.riskRow}>
                <TouchableOpacity
                  style={styles.riskHeader}
                  onPress={() => setExpanded(expanded === r.disease ? null : r.disease)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riskName}>{name(r)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${r.score}%`, backgroundColor: bandColor(r.band) }]} />
                    </View>
                    {r.coverage ? (
                      <Text style={styles.caption}>{t('engines.disease.coverageDisease', r.coverage)}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.riskBand, { color: bandColor(r.band) }]}>{band(r)}</Text>
                  <MaterialCommunityIcons
                    name={expanded === r.disease ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.roles.light.textTertiary}
                  />
                </TouchableOpacity>
                {expanded === r.disease ? (
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>{t('engines.disease.why')}</Text>
                    {r.triggers.length === 0 ? (
                      <Text style={styles.caption}>{t('engines.disease.noTriggers')}</Text>
                    ) : (
                      r.triggers.map((trig, i) => (
                        <View key={trig} style={styles.step}>
                          <MaterialCommunityIcons name="circle-small" size={16} color={theme.roles.light.textSecondary} />
                          <Text style={styles.stepText}>{tk(r.triggerKeys?.[i], trig)}</Text>
                        </View>
                      ))
                    )}
                    <Text style={styles.detailLabel}>{t('engines.disease.whatToDo')}</Text>
                    {r.steps.map((s, i) => (
                      <View key={i} style={styles.step}>
                        <MaterialCommunityIcons name="arrow-right-thin" size={16} color={theme.roles.light.primary} />
                        <Text style={styles.stepText}>{tk(r.stepKeys?.[i], s)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
};

const bandColor = (band: string) =>
  band === 'Critical' ? theme.roles.light.dangerBorder
    : band === 'Watch' ? theme.roles.light.warningBorder
      : theme.roles.light.successBorder;

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] },
  title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
  subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
  card: { marginBottom: theme.spacing[4], padding: theme.spacing[4] },
  note: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
  coverage: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
  sectionLabel: { ...theme.typeScale.overline, color: theme.roles.light.textTertiary, marginBottom: theme.spacing[3] },
  cta: { marginTop: theme.spacing[3] },
  topCard: { borderLeftWidth: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[2] },
  topName: { ...theme.typeScale.h2, color: theme.roles.light.textPrimary, flex: 1 },
  riskRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.roles.light.borderDefault },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[3] },
  riskName: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, fontWeight: '600', marginBottom: theme.spacing[1] },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: theme.roles.light.surfaceVariant, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  riskBand: { ...theme.typeScale.labelSmall },
  caption: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary, marginTop: theme.spacing[1] },
  detail: { paddingBottom: theme.spacing[3], paddingLeft: theme.spacing[1], gap: theme.spacing[1] },
  detailLabel: { ...theme.typeScale.overline, color: theme.roles.light.textTertiary, marginTop: theme.spacing[2] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[1] },
  stepText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textPrimary, flex: 1 },
});

export default DiseaseRiskScreen;
