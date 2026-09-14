/**
 * "Your day" — the top of Home. Mode, score + band, the verdict sentence and
 * the single next thing to do; tap opens the Daily Brief.
 *
 * Self-contained so Home's edit stays one line: it reads today's brief under
 * the same cache key the Daily Brief screen uses (instant when opened), and it
 * renders nothing while the flag is off, while loading, or on a failed read
 * with no cached copy — Home must never wait on it.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { dailyBriefApi, type DailyBrief } from '../../api/dailyBrief';
import { qk } from '../../query/client';
import { useAppQuery, useRefetchOnFocus } from '../../query/hooks';
import { useFlag } from '../../features/remoteFlags';
import { briefMode, coverageSentence, istDate, topTodo, verdictSentence } from '../../features/dailyBriefText';
import { Icon } from '../ui/Icon';
import { BAND_TONE, c } from './Section';

export const YourDayCard: React.FC<{ farmId?: string | null; onOpen: () => void }> = (props) =>
    useFlag('dailyBrief') ? <YourDay {...props} /> : null;

const YourDay: React.FC<{ farmId?: string | null; onOpen: () => void }> = ({ farmId, onOpen }) => {
    const { t } = useTranslation();
    const date = istDate();
    const key = qk.dailyBrief(date, farmId);
    const query = useAppQuery<DailyBrief>({
        queryKey: key,
        queryFn: async () => (await dailyBriefApi.get(farmId ? { date, farmId } : { date })).data,
    });
    useRefetchOnFocus(key);

    const brief = query.data;
    if (!brief || brief.farms.length === 0) return null;

    const mode = t(`dailyBrief.modes.${briefMode(date)}`);
    const score = brief.score;
    const band = !score ? 'none' : brief.verdict.band === 'incomplete' ? 'incomplete' : score.band;
    const tone = BAND_TONE[band];
    const verdict = verdictSentence(brief, t);
    const coverage = coverageSentence(brief, t);
    const next = topTodo(brief, t);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onOpen}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={[
                t('dailyBrief.homeCard.a11y', { mode, verdict }),
                score ? t('dailyBrief.score.a11y', { value: score.value, band: t(`dailyBrief.bands.${band}`) }) : null,
                coverage,
                next ? t('dailyBrief.homeCard.topTodo', { item: next }) : null,
            ].filter(Boolean).join('. ')}
            testID="home-your-day"
        >
            <View style={[styles.edge, { backgroundColor: tone.mark }]} />
            <View style={styles.scoreCol}>
                <Text style={[styles.score, { color: score ? tone.text : c.textDisabled }]}>{score ? score.value : '–'}</Text>
                <Text style={[styles.band, { color: tone.text }]} numberOfLines={1}>
                    {t(`dailyBrief.bands.${band}`)}
                </Text>
            </View>
            <View style={styles.text}>
                <Text style={styles.mode}>{`${t('dailyBrief.yourDay')} · ${mode}`}</Text>
                <Text style={styles.verdict}>{verdict}</Text>
                {!!coverage && <Text style={band === 'incomplete' ? styles.coverageStrong : styles.next}>{coverage}</Text>}
                {!!next && (
                    <Text style={styles.next} numberOfLines={2}>
                        {t('dailyBrief.homeCard.topTodo', { item: next })}
                    </Text>
                )}
            </View>
            <Icon name="chevron_right" size={22} color={c.textTertiary} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[3],
        paddingRight: theme.spacing[3],
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[4],
        backgroundColor: c.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: c.borderDefault,
        overflow: 'hidden',
    },
    edge: { width: 4, alignSelf: 'stretch' },
    scoreCol: { width: 64, alignItems: 'center' },
    score: { ...theme.typeScale.numericLarge, fontFamily: 'DMMono-Medium', fontSize: 30, lineHeight: 36 },
    band: { ...theme.typeScale.labelMedium },
    text: { flex: 1, minWidth: 0 },
    mode: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    verdict: { ...theme.typeScale.labelLarge, fontSize: 15, lineHeight: 21, color: c.textPrimary },
    next: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginTop: 2 },
    coverageStrong: { ...theme.typeScale.labelMedium, color: c.textPrimary, marginTop: 2 },
});
