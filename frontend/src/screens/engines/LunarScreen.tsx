/**
 * LunarScreen — Lunar Molt module (lunar_module_spec). Shows the current moon
 * phase as a vector diagram, the molt window, and (with the pond's latest ABW)
 * the molt-risk band with steps.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { NumberField } from '../../components/ui/NumberField';
import { SeverityPill, type Severity } from '../../components/ui/SeverityPill';
import { MoonDiagram } from '../../components/charts/MoonDiagram';
import { PrefilledBanner } from '../../components/ui/PrefilledBanner';
import { ConfidenceChip } from '../../components/ui/ConfidenceChip';
import { theme } from '../../theme';
import { lunarApi, type MoonPhase, type MoltRisk } from '../../api/lunar';
import { pondContextApi, type PondContext } from '../../api/pondContext';
import { localizePhaseName } from '../../features/lunarPhaseI18n';

const bandSeverity = (b: string): Severity =>
  b === 'Critical' ? 'critical' : b === 'Watch' ? 'watch' : 'low';

export const LunarScreen = ({ route }: any) => {
  const { t } = useTranslation();
  const { pondId, pondName } = route.params ?? {};
  const [phase, setPhase] = useState<MoonPhase | null>(null);
  const [abw, setAbw] = useState('20');
  const [risk, setRisk] = useState<MoltRisk | null>(null);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<PondContext | null>(null);

  useEffect(() => {
    lunarApi.phase().then(({ data }) => setPhase(data)).catch(() => {});
  }, []);

  // Prefill ABW from the latest sampling.
  useEffect(() => {
    if (!pondId) return;
    pondContextApi.get(pondId).then(({ data }) => {
      setCtx(data);
      if (data.abwG != null) setAbw(String(data.abwG));
    }).catch(() => {});
  }, [pondId]);

  const assess = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await lunarApi.risk({ abwG: Number(abw) });
      setPhase(data.phase);
      setRisk(data.risk);
    } catch (e: any) {
      Alert.alert(t('engines.common.couldNotCompute'), e?.response?.data?.message ?? t('engines.common.tryAgain'));
    } finally {
      setLoading(false);
    }
  }, [abw, t]);

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <MaterialCommunityIcons name="moon-waning-crescent" size={26} color={theme.roles.light.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('engines.lunar.title')}</Text>
            {pondName ? <Text style={styles.subtitle}>{pondName}</Text> : null}
          </View>
        </View>

        {phase && (
          <Card style={[styles.card, styles.phaseCard]}>
            <MoonDiagram phase={phase.phase} size={104} />
            <View style={{ flex: 1 }}>
              <Text style={styles.phaseName}>{localizePhaseName(phase.name, t)}</Text>
              <Text style={styles.phaseMeta}>{t('engines.lunar.illuminated', { pct: Math.round(phase.illumination * 100) })}</Text>
              {phase.inMoltWindow ? (
                <SeverityPill severity="watch" label={t('engines.lunar.moltWindow', { days: phase.daysToSpringTide.toFixed(1) })} icon="waves" />
              ) : (
                <SeverityPill severity="low" label={t('engines.lunar.toNextWindow', { days: phase.daysToSpringTide.toFixed(1) })} icon="calendar-blank-outline" />
              )}
            </View>
          </Card>
        )}

        {ctx && ctx.abwG != null && <PrefilledBanner doc={ctx.doc} />}

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>{t('engines.lunar.assessment')}</Text>
          <View style={styles.row}>
            <NumberField label={t('engines.lunar.abw')} value={abw} onChangeText={setAbw} unit="g" />
            <Button title={t('engines.lunar.assess')} onPress={assess} loading={loading} style={styles.assessBtn} />
          </View>

          {risk && (
            <View style={styles.riskBox}>
              <View style={styles.riskTop}>
                <Text style={styles.riskScore}>{risk.score}</Text>
                <SeverityPill severity={bandSeverity(risk.band)} label={risk.band} />
              </View>
              <Text style={styles.riskMeta}>
                {t('engines.lunar.moltPressure', { pressure: Math.round(risk.moltPressure * 100), vuln: Math.round(risk.vulnerability * 100) })}
              </Text>
              {ctx && <ConfidenceChip confidence={ctx.confidence} />}
              <View style={styles.steps}>
                {risk.phaseRel === 'peak' ? (
                  <Step text={t('engines.lunar.stepPeak')} />
                ) : risk.phaseRel === 'pre' ? (
                  <Step text={t('engines.lunar.stepPre')} />
                ) : (
                  <Step text={t('engines.lunar.stepPost')} />
                )}
                <Step text={t('engines.lunar.stepNoHandling')} />
              </View>
            </View>
          )}
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
};

const Step = ({ text }: { text: string }) => (
  <View style={styles.step}>
    <MaterialCommunityIcons name="arrow-right-thin" size={16} color={theme.roles.light.primary} />
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] },
  title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
  subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
  card: { marginBottom: theme.spacing[4], padding: theme.spacing[4] },
  phaseCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
  phaseName: { ...theme.typeScale.h2, color: theme.roles.light.textPrimary },
  phaseMeta: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
  sectionLabel: { ...theme.typeScale.overline, color: theme.roles.light.textTertiary, marginBottom: theme.spacing[3] },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing[3] },
  assessBtn: { minWidth: 110 },
  riskBox: { marginTop: theme.spacing[4], gap: theme.spacing[2] },
  riskTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] },
  riskScore: { ...theme.typeScale.numericLarge, color: theme.roles.light.textPrimary },
  riskMeta: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
  steps: { gap: theme.spacing[1], marginTop: theme.spacing[2] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[1] },
  stepText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textPrimary, flex: 1 },
});

export default LunarScreen;
