/**
 * HarvestTimingScreen — the Harvest-Timing Decision Engine surface
 * (farmer_features_spec §1, harvest-and-molt H6). Every input is the farm's
 * own: ADG from its samplings, prices from its buyer quote, disease risk from
 * its logs. Nothing is invented — a missing input is a refusal, not a default.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { NumberField } from '../../components/ui/NumberField';
import { SeverityPill } from '../../components/ui/SeverityPill';
import { PrefilledBanner } from '../../components/ui/PrefilledBanner';
import { ConfidenceChip } from '../../components/ui/ConfidenceChip';
import { LineChart } from '../../components/charts/LineChart';
import { PriceQuoteSheet } from '../../components/harvest/PriceQuoteSheet';
import { theme } from '../../theme';
import { harvestTimingApi, type HarvestTimingResult, type DayProjection } from '../../api/harvestTiming';
import { priceQuotesApi, type CurrentQuote } from '../../api/priceQuotes';
import { diseaseWarningApi } from '../../api/diseaseWarning';
import { apiErrorMessage } from '../../api/errors';
import { usePondContext } from '../../hooks/usePondContext';
import { usePermissions } from '../../hooks/usePermissions';
import { MissingInputs } from '../../components/ui/MissingInputs';
import { EngineUnavailable } from '../../components/ui/EngineUnavailable';
import { missingInputs } from '../../features/engineInputs';
import {
  harvestTimingRequired, DEFAULT_CARRYING_KG_M2, addDaysIso, signedInr,
} from '../../features/harvestTimingInputs';
import { todayLocalISODate } from '../../utils/localDate';

const c = theme.roles.light;

const fill = (v: number | null | undefined, setter: (s: string) => void) => {
  if (v != null) setter(String(v));
};

const inr = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN');

const isMoltDay = (p?: DayProjection) => p?.moltPhase === 'peak' || p?.moltPhase === 'post';

export const HarvestTimingScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { pondId, pondName, cropId: routeCropId } = route.params ?? {};
  const [abwNow, setAbwNow] = useState('');
  const [adgNow, setAdgNow] = useState('');
  const [nNow, setNNow] = useState('');
  const [areaM2, setAreaM2] = useState('');
  const [carrying, setCarrying] = useState(String(DEFAULT_CARRYING_KG_M2));
  const [carryingAssumed, setCarryingAssumed] = useState(true);
  const [feedPrice, setFeedPrice] = useState('');
  const [diseaseRisk, setDiseaseRisk] = useState('0');
  /** False = the Disease engine had no score for this pond; risk left out. */
  const [diseaseIncluded, setDiseaseIncluded] = useState(false);

  const [quote, setQuote] = useState<CurrentQuote | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HarvestTimingResult | null>(null);
  const { ctx, error: ctxError, refetch } = usePondContext(pondId);
  const farmId = ctx?.farmId;
  const cropId = ctx?.cropId ?? routeCropId;
  const { canViewFinancials } = usePermissions(farmId);

  useEffect(() => {
    navigation?.setOptions?.({ title: t('engines.harvest.title') });
  }, [navigation, t]);

  // Auto-fill from the farmer's own logs — only ever from a REAL value (E1).
  useEffect(() => {
    if (!ctx) return;
    fill(ctx.abwG, setAbwNow);
    fill(ctx.adgG, setAdgNow);
    fill(ctx.livePopulation, setNNow);
    fill(ctx.areaM2, setAreaM2);
    if (ctx.crop?.carryingCapacityKgM2 != null) {
      setCarrying(String(ctx.crop.carryingCapacityKgM2));
      setCarryingAssumed(false);
    }
    fill(ctx.crop?.feedPriceRpPerKg, setFeedPrice);
  }, [ctx]);

  const loadQuote = useCallback(() => {
    if (!farmId || !canViewFinancials) return;
    priceQuotesApi.current(farmId).then(({ data }) => setQuote(data)).catch(() => setQuote(null));
  }, [farmId, canViewFinancials]);

  // Refetch on focus: a quote saved from Money must reach this screen.
  useFocusEffect(loadQuote);

  // Disease risk from the Early-Warning engine; without it, 0 and SAID so.
  useFocusEffect(
    useCallback(() => {
      if (!pondId) return;
      diseaseWarningApi
        .current(pondId)
        .then(({ data }) => {
          const top = Math.max(0, ...(data.risks ?? []).map((r) => Number(r.score) || 0));
          setDiseaseRisk(String(Math.round(top)));
          setDiseaseIncluded(true);
        })
        .catch(() => {
          setDiseaseRisk('0');
          setDiseaseIncluded(false);
        });
    }, [pondId]),
  );

  const quoteUsable = !!quote?.quote && quote.status !== 'missing';
  const missing = missingInputs(
    harvestTimingRequired({ abwNow, adgNow, nNow, areaM2, feedPrice, quoteUsable }),
  );

  const compute = useCallback(async () => {
    if (!quote?.quote) return;
    setLoading(true);
    try {
      const { data } = await harvestTimingApi.optimize({
        abwNow: Number(abwNow),
        adgNow: Number(adgNow),
        nNow: Number(nNow),
        areaM2: Number(areaM2),
        carryingCapacityKgM2: Number(carrying) || DEFAULT_CARRYING_KG_M2,
        feedPricePerKg: Number(feedPrice),
        diseaseRisk: Math.min(100, Math.max(0, Number(diseaseRisk) || 0)) / 100,
        priceBands: quote.quote.bands,
        horizon: 30,
        // Recorded server-side (harvest_recommendations) for later ADG calibration.
        pondId,
        cropId: cropId ?? undefined,
        persist: !!pondId,
      });
      setResult(data);
    } catch (e: any) {
      Alert.alert(t('engines.common.couldNotCompute'), apiErrorMessage(e, t('engines.common.tryAgain')));
    } finally {
      setLoading(false);
    }
  }, [abwNow, adgNow, nNow, areaM2, carrying, feedPrice, diseaseRisk, quote, pondId, cropId, t]);

  const chart = useMemo(() => {
    if (!result) return null;
    const pts = result.projections.filter((_, i) => i % 5 === 0);
    return {
      labels: pts.map((p) => `${p.day}`),
      datasets: [{ data: pts.map((p) => Math.round(p.netProfit)) }],
    };
  }, [result]);

  const dateOf = (p?: DayProjection) =>
    p?.date ?? addDaysIso(todayLocalISODate(), p?.day ?? 0);
  const best = result ? result.projections[result.optimalDay] : undefined;

  const planThis = () => {
    if (!best) return;
    navigation.navigate('HarvestPlans', {
      pondId,
      pondName,
      cropId,
      farmId,
      prefill: {
        date: dateOf(best),
        targetKg: Math.round(best.biomassKg),
        pricePerKg: Math.round(best.pricePerKg),
      },
    });
  };

  const header = (
    <View style={styles.head}>
      <MaterialCommunityIcons name="calendar-clock" size={26} color={c.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('engines.harvest.title')}</Text>
        {pondName ? <Text style={styles.subtitle}>{pondName}</Text> : null}
      </View>
    </View>
  );

  // Money screen: without VIEW_FINANCIALS there are no numbers to show (B6).
  if (ctx && !canViewFinancials) {
    return (
      <ScreenWrapper>
        {header}
        <Card style={styles.card}>
          <Text style={styles.gainMuted} testID="harvest-ask-owner">{t('engines.harvest.askOwner')}</Text>
        </Card>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        {header}

        {/* A failure is a state now, not a swallowed catch (E1). */}
        {ctxError ? <EngineUnavailable onRetry={refetch} /> : null}
        {ctx && <PrefilledBanner doc={ctx.doc} recordedAt={ctx.waterQuality?.recordedAt} />}

        {/* Buyer quote (H5) */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>{t('engines.quote.title')}</Text>
          {quote?.quote ? (
            <Text
              style={[styles.meta, quote.status !== 'fresh' && { color: c.warningText }]}
              testID="harvest-quote-age"
            >
              {quote.status === 'fresh'
                ? t('engines.harvest.quoteAge', { date: quote.quote.quotedOn, days: quote.ageDays ?? 0 })
                : quote.status === 'stale'
                  ? t('engines.harvest.quoteStale', { days: quote.ageDays ?? 0 })
                  : t('engines.harvest.quoteTooOld', { days: quote.ageDays ?? 0 })}
            </Text>
          ) : (
            <Text style={styles.meta}>{t('engines.quote.none')}</Text>
          )}
          <TouchableOpacity onPress={() => setQuoteOpen(true)} accessibilityRole="button" style={styles.linkBtn}>
            <Text style={styles.link}>{t('engines.quote.open')} ›</Text>
          </TouchableOpacity>
        </Card>

        {/* Inputs */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>{t('engines.harvest.currentCrop')}</Text>
          <View style={styles.grid}>
            <NumberField label={t('engines.harvest.abw')} value={abwNow} onChangeText={setAbwNow} unit="g" />
            <NumberField label={t('engines.harvest.adg')} value={adgNow} onChangeText={setAdgNow} unit="g/d" />
            <NumberField label={t('engines.harvest.population')} value={nNow} onChangeText={setNNow} />
            <NumberField label={t('engines.harvest.area')} value={areaM2} onChangeText={setAreaM2} unit="m²" />
            <NumberField
              label={t('engines.harvest.carrying')}
              value={carrying}
              onChangeText={(v) => { setCarrying(v); setCarryingAssumed(false); }}
              unit="kg/m²"
            />
            <NumberField label={t('engines.harvest.feedPrice')} value={feedPrice} onChangeText={setFeedPrice} unit="₹/kg" />
            <NumberField label={t('engines.harvest.diseaseRisk')} value={diseaseRisk} onChangeText={setDiseaseRisk} unit="%" />
          </View>
          {ctx?.adgNote === 'negative' && (
            <Text style={[styles.meta, { color: c.warningText }]}>{t('engines.harvest.adgNegative')}</Text>
          )}
          {carryingAssumed && (
            <View style={styles.chip} testID="harvest-carrying-assumed">
              <Text style={styles.chipText}>
                {t('engines.harvest.carryingAssumed', { value: DEFAULT_CARRYING_KG_M2 })}
              </Text>
            </View>
          )}
          {!diseaseIncluded && Number(diseaseRisk) === 0 && (
            <Text style={styles.meta} testID="harvest-disease-excluded">{t('engines.harvest.diseaseNotIncluded')}</Text>
          )}
          <MissingInputs missing={missing} />
          {!quoteUsable && (
            <Button
              title={t('engines.quote.open')}
              variant="outlined"
              onPress={() => setQuoteOpen(true)}
              style={styles.cta}
            />
          )}
          <Button
            title={t('engines.harvest.computeBtn')}
            onPress={compute}
            loading={loading}
            disabled={missing.length > 0}
            style={styles.cta}
          />
        </Card>

        {loading && !result && <ActivityIndicator color={c.primary} style={{ marginTop: theme.spacing[6] }} />}

        {result && (
          <>
            {/* Verdict hero */}
            <Card style={[styles.card, styles.hero, result.recommendNow ? styles.heroNow : styles.heroHold]}>
              <SeverityPill
                severity={result.recommendNow ? 'critical' : 'success'}
                label={result.recommendNow ? t('engines.harvest.action') : t('engines.harvest.opportunity')}
                icon={result.recommendNow ? 'alert-octagon-outline' : 'trending-up'}
              />
              <Text style={styles.verdict}>
                {result.recommendNow ? t('engines.harvest.harvestNow') : t('engines.harvest.holdDays', { days: result.optimalDay })}
              </Text>
              <ConfidenceChip confidence={ctx?.confidence} />
              {!result.recommendNow && (
                <Text style={styles.gain}>{t('engines.harvest.moreProfit', { amount: inr(result.expectedGain) })}</Text>
              )}
              {result.recommendNow && (
                <Text style={styles.gainMuted}>{t('engines.harvest.declines')}</Text>
              )}
              {best?.priceExtrapolated && quote?.quote && (
                <Text style={[styles.meta, { color: c.warningText }]}>
                  {t('engines.harvest.extrapolated', {
                    count: Math.round(best.count),
                    band: best.count < Math.min(...quote.quote.bands.map((b) => b.count))
                      ? Math.min(...quote.quote.bands.map((b) => b.count))
                      : Math.max(...quote.quote.bands.map((b) => b.count)),
                  })}
                </Text>
              )}
              {result.safeDay && (
                <View style={styles.molt} testID="harvest-molt-warning">
                  <Text style={styles.moltText}>
                    {t(`engines.harvest.moltWarning_${result.safeDay.phase === 'post' ? 'post' : 'peak'}`, {
                      day: result.optimalDay,
                      date: dateOf(best),
                    })}
                  </Text>
                  {[result.safeDay.before, result.safeDay.after].filter(Boolean).map((s) => (
                    <Text key={s!.day} style={styles.moltText}>
                      {t('engines.harvest.safeOption', { day: s!.day, date: s!.date, diff: signedInr(s!.diff) })}
                    </Text>
                  ))}
                </View>
              )}
              {pondId ? (
                <Button title={t('engines.harvest.planThis')} onPress={planThis} style={styles.cta} />
              ) : null}
            </Card>

            {/* Projection, with molt peak/post days shaded underneath */}
            {chart && (
              <Card style={styles.card}>
                <Text style={styles.sectionLabel}>{t('engines.harvest.projection')}</Text>
                <LineChart data={chart} />
                {result.projections.some(isMoltDay) && (
                  <>
                    <View style={styles.strip} testID="harvest-molt-strip">
                      {result.projections.map((p) => (
                        <View key={p.day} style={[styles.stripCell, isMoltDay(p) && styles.stripMolt]} />
                      ))}
                    </View>
                    <View style={styles.legend}>
                      <View style={[styles.legendSwatch, styles.stripMolt]} />
                      <Text style={styles.meta}>{t('engines.harvest.moltLegend')}</Text>
                    </View>
                  </>
                )}
              </Card>
            )}

            {/* Scenarios */}
            <Card style={styles.card}>
              <Text style={styles.sectionLabel}>{t('engines.harvest.scenarios')}</Text>
              <ScenarioRow
                icon="basket-outline"
                title={t('engines.harvest.harvestToday')}
                value={inr(result.netNow)}
                meta={t('engines.harvest.countBiomass', { count: result.projections[0].count, biomass: result.projections[0].biomassKg })}
                highlight={result.recommendNow}
              />
              <ScenarioRow
                icon="clock-outline"
                title={t('engines.harvest.holdTo', { day: result.optimalDay })}
                value={inr(result.netOptimal)}
                meta={t('engines.harvest.countBiomass', { count: best?.count ?? 0, biomass: best?.biomassKg ?? 0 })}
                highlight={!result.recommendNow}
              />
              {result.partial && (
                <ScenarioRow
                  icon="call-split"
                  title={t('engines.harvest.partial', { pct: Math.round(result.partial.pct * 100) })}
                  value={inr(result.partial.total)}
                  meta={result.partial.betterThanFull ? t('engines.harvest.bestOverstocked') : t('engines.harvest.belowFull')}
                  highlight={result.partial.betterThanFull}
                />
              )}
            </Card>
          </>
        )}
      </ScrollView>
      <PriceQuoteSheet
        farmId={farmId}
        visible={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        onSaved={loadQuote}
      />
    </ScreenWrapper>
  );
};

const ScenarioRow = ({
  icon, title, value, meta, highlight,
}: { icon: any; title: string; value: string; meta: string; highlight?: boolean }) => (
  <View style={[styles.scenario, highlight && styles.scenarioActive]}>
    <MaterialCommunityIcons
      name={icon}
      size={20}
      color={highlight ? c.primary : c.textSecondary}
    />
    <View style={{ flex: 1 }}>
      <Text style={styles.scenarioTitle}>{title}</Text>
      <Text style={styles.scenarioMeta}>{meta}</Text>
    </View>
    <Text style={[styles.scenarioValue, highlight && { color: c.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] },
  title: { ...theme.typeScale.h1, color: c.textPrimary },
  subtitle: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
  card: { marginBottom: theme.spacing[4], padding: theme.spacing[4] },
  sectionLabel: { ...theme.typeScale.overline, color: c.textTertiary, marginBottom: theme.spacing[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[3] },
  cta: { marginTop: theme.spacing[4] },
  meta: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginTop: theme.spacing[2] },
  linkBtn: { paddingVertical: theme.spacing[2] },
  link: { ...theme.typeScale.labelLarge, color: c.primary },
  chip: {
    alignSelf: 'flex-start', marginTop: theme.spacing[2], paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1], borderRadius: theme.radius.sm, backgroundColor: c.warningBg,
  },
  chipText: { ...theme.typeScale.caption, color: c.warningText },
  hero: { alignItems: 'flex-start', gap: theme.spacing[2], borderLeftWidth: 4 },
  heroHold: { borderLeftColor: c.successBorder },
  heroNow: { borderLeftColor: c.dangerBorder },
  verdict: { ...theme.typeScale.displaySmall, color: c.textPrimary },
  gain: { ...theme.typeScale.bodyLarge, color: c.successText },
  gainMuted: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
  molt: { gap: theme.spacing[1], padding: theme.spacing[3], borderRadius: theme.radius.md, backgroundColor: c.warningBg, alignSelf: 'stretch' },
  moltText: { ...theme.typeScale.bodySmall, color: c.warningText },
  strip: { flexDirection: 'row', height: 10, marginTop: theme.spacing[2], borderRadius: 2, overflow: 'hidden' },
  stripCell: { flex: 1, backgroundColor: c.surfaceVariant },
  stripMolt: { backgroundColor: c.warningBorder },
  legend: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
  legendSwatch: { width: 12, height: 12, borderRadius: 2, marginTop: theme.spacing[2] },
  scenario: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault,
  },
  scenarioActive: { backgroundColor: c.surfaceOverlay, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing[2] },
  scenarioTitle: { ...theme.typeScale.bodyMedium, color: c.textPrimary, fontWeight: '600' },
  scenarioMeta: { ...theme.typeScale.caption, color: c.textSecondary },
  scenarioValue: { ...theme.typeScale.numericSmall, color: c.textPrimary },
});

export default HarvestTimingScreen;
