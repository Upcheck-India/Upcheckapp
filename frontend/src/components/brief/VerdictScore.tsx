/**
 * The verdict sentence and the Day Score — one of the page's two loud things.
 *
 * The number is set large in DM Mono and coloured by its band, with a slim
 * 0–100 meter under it whose 60 and 80 notches are the band edges, so "74" is
 * readable as "just short of good" without a legend. Everything around it is
 * small and grey on purpose.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DailyBrief } from '../../api/dailyBrief';
import {
    basedOnText,
    deltaText,
    pondNameMap,
    reasonText,
    coverageSentence,
    verdictSentence,
} from '../../features/dailyBriefText';
import { BAND_TONE, SEVERITY_MARK, HIT, c } from './Section';

export const VerdictScore: React.FC<{ brief: DailyBrief; onExplain: () => void }> = ({ brief, onExplain }) => {
    const { t } = useTranslation();
    const score = brief.score;
    const incomplete = !!score && brief.verdict.band === 'incomplete';
    const band = !score ? 'none' : incomplete ? 'incomplete' : score.band;
    const tone = BAND_TONE[band];
    const names = pondNameMap(brief);
    const delta = score && !incomplete ? deltaText(score.value, brief.previousScore, t) : null;
    const coverage = coverageSentence(brief, t);
    // Cap reasons first — they are why the number is what it is.
    const reasons = score
        ? [...score.capReasons, ...score.reasons.filter((r) => !score.capReasons.some((k) => k.code === r.code && k.pondId === r.pondId))].slice(0, 3)
        : [];

    return (
        <View style={styles.wrap}>
            <View
                style={styles.scoreRow}
                accessible
                accessibilityLabel={
                    score
                        ? t('dailyBrief.score.a11y', { value: score.value, band: t(`dailyBrief.bands.${band}`) })
                        : t('dailyBrief.score.noScore')
                }
            >
                <View style={styles.numberCol}>
                    <View style={styles.numberLine}>
                        <Text style={[styles.number, { color: score ? tone.text : c.textDisabled }]} testID="brief-score">
                            {score ? score.value : '–'}
                        </Text>
                        {!!score && <Text style={styles.outOf}>{t('dailyBrief.score.outOf')}</Text>}
                    </View>
                    <View style={styles.meter}>
                        {!!score && (
                            <View style={[styles.meterFill, { width: `${Math.max(2, score.value)}%`, backgroundColor: tone.mark }]} />
                        )}
                        <View style={[styles.notch, { left: '60%' }]} />
                        <View style={[styles.notch, { left: '80%' }]} />
                    </View>
                </View>
                <View style={styles.bandCol}>
                    <Text style={[styles.band, { color: tone.text }]}>
                        {score ? t(`dailyBrief.bands.${band}`) : t('dailyBrief.score.noScore')}
                    </Text>
                    {!!delta && <Text style={styles.delta}>{delta}</Text>}
                </View>
            </View>

            <Text style={styles.verdict} testID="brief-verdict">
                {verdictSentence(brief, t)}
            </Text>
            {!!coverage && (
                <Text style={incomplete ? styles.coverage : styles.sub} testID="brief-coverage">
                    {coverage}
                </Text>
            )}

            {!!score?.capped && <Text style={[styles.sub, { color: c.dangerText }]}>{t('dailyBrief.score.heldBelow')}</Text>}
            {reasons.map((r, i) => (
                <View key={`${r.code}-${r.pondId ?? ''}-${i}`} style={styles.reason}>
                    <View style={[styles.reasonMark, { backgroundColor: SEVERITY_MARK[r.severity] }]} />
                    <Text style={styles.reasonText}>
                        {r.pondId && names[r.pondId] ? <Text style={styles.reasonPond}>{names[r.pondId]}  </Text> : null}
                        {reasonText(r, t)}
                    </Text>
                </View>
            ))}

            {!!score && <Text style={styles.basedOn}>{basedOnText(score, t)}</Text>}
            <TouchableOpacity onPress={onExplain} hitSlop={HIT} accessibilityRole="button" style={styles.link}>
                <Text style={styles.linkText}>{t('dailyBrief.score.howWorked')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[5], paddingBottom: theme.spacing[4] },
    scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing[4] },
    numberCol: { width: 148 },
    numberLine: { flexDirection: 'row', alignItems: 'baseline' },
    number: {
        ...theme.typeScale.numericHero,
        fontSize: 72,
        lineHeight: 80,
        letterSpacing: -3,
    },
    outOf: { ...theme.typeScale.numericSmall, color: c.textTertiary, marginLeft: theme.spacing[1] },
    meter: {
        height: 6,
        borderRadius: theme.radius.full,
        backgroundColor: c.surfaceVariant,
        overflow: 'hidden',
        marginTop: theme.spacing[1],
    },
    meterFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: theme.radius.full },
    notch: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: c.surface },
    bandCol: { flex: 1, minWidth: 0, paddingBottom: theme.spacing[1] },
    band: { ...theme.typeScale.h3, fontFamily: 'Nunito-Bold' },
    delta: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    verdict: { ...theme.typeScale.h1, color: c.textPrimary, marginTop: theme.spacing[4] },
    sub: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginTop: theme.spacing[1] },
    coverage: { ...theme.typeScale.bodyMedium, fontFamily: 'DMSans-SemiBold', color: c.textPrimary, marginTop: theme.spacing[1] },
    reason: { flexDirection: 'row', gap: theme.spacing[2.5], marginTop: theme.spacing[2.5], alignItems: 'flex-start' },
    reasonMark: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    reasonText: { ...theme.typeScale.bodyMedium, color: c.textPrimary, flex: 1 },
    reasonPond: { fontFamily: 'DMSans-SemiBold' },
    basedOn: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[3] },
    link: { alignSelf: 'flex-start', marginTop: theme.spacing[2], minHeight: 32, justifyContent: 'center' },
    linkText: { ...theme.typeScale.labelLarge, color: c.textLink },
});
