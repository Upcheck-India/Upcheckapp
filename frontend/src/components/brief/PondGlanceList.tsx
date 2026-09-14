/**
 * One compact row per pond: name, day of crop, score chip, and three numbers a
 * farmer writes down — lowest DO, feed against its 3-day average, deaths.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { PondDay } from '../../api/dailyBrief';
import { fmtNum } from '../../features/dailyBriefText';
import { Section, BAND_TONE, HIT, c } from './Section';

const ZONE_TEXT = { optimal: c.textPrimary, caution: c.warningText, critical: c.dangerText, none: c.textTertiary };

const Figure: React.FC<{ label: string; value: string; unit?: string; color?: string; suffix?: string; suffixColor?: string }> = ({
    label,
    value,
    unit,
    color = c.textPrimary,
    suffix,
    suffixColor,
}) => (
    <View style={styles.figure}>
        <Text style={[styles.figValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {value}
            {!!unit && <Text style={styles.figUnit}>{` ${unit}`}</Text>}
            {!!suffix && <Text style={[styles.figUnit, { color: suffixColor }]}>{` ${suffix}`}</Text>}
        </Text>
        <Text style={styles.figLabel} numberOfLines={1}>{label}</Text>
    </View>
);

export const PondGlanceList: React.FC<{
    ponds: PondDay[];
    isToday: boolean;
    onOpen: (p: PondDay) => void;
    onRoutine: (p: PondDay) => void;
}> = ({ ponds, isToday, onOpen, onRoutine }) => {
    const { t } = useTranslation();
    if (!ponds.length) return null;
    const dash = '–';

    return (
        <Section title={t('dailyBrief.blocks.ponds')} trailing={String(ponds.length)} testID="brief-ponds">
            {ponds.map((p, i) => {
                const tone = BAND_TONE[p.score?.band ?? 'none'];
                const minDo = p.water.do?.min;
                const avg = p.feed.prev3DayAvgKg;
                const feedArrow = avg != null && avg > 0 && p.feed.kg > 0 ? (p.feed.kg >= avg ? '↑' : '↓') : undefined;
                const deaths = p.health.mortality;
                const scoreLabel = p.score ? `${p.score.value}, ${t(`dailyBrief.bands.${p.score.band}`)}` : t('dailyBrief.ponds.noScore');
                return (
                    <View key={p.pondId} style={[styles.row, i === 0 && styles.firstRow]}>
                        <TouchableOpacity
                            onPress={() => onOpen(p)}
                            accessibilityRole="button"
                            accessibilityLabel={t('dailyBrief.ponds.rowA11y', {
                                pond: p.name,
                                score: scoreLabel,
                                do: minDo != null ? fmtNum(minDo) : t('dailyBrief.ponds.notLogged'),
                                feed: fmtNum(p.feed.kg),
                                deaths: deaths ?? t('dailyBrief.ponds.notLogged'),
                            })}
                        >
                            <View style={styles.head}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                                    <Text style={styles.doc}>
                                        {p.cycleActive && p.doc != null ? t('dailyBrief.ponds.doc', { doc: p.doc }) : t('dailyBrief.ponds.noCycle')}
                                    </Text>
                                </View>
                                <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                                    <Text style={[p.score ? styles.chipValue : styles.chipText, { color: tone.text }]}>
                                        {p.score ? p.score.value : t('dailyBrief.ponds.noScore')}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.figures}>
                                <Figure
                                    label={t('dailyBrief.ponds.minDo')}
                                    value={minDo != null ? fmtNum(minDo) : dash}
                                    unit={minDo != null ? 'mg/L' : undefined}
                                    color={ZONE_TEXT[p.water.do?.zone ?? 'none']}
                                />
                                <Figure
                                    label={t('dailyBrief.ponds.feed')}
                                    value={p.feed.kg > 0 ? fmtNum(p.feed.kg) : dash}
                                    unit={p.feed.kg > 0 ? 'kg' : undefined}
                                    suffix={feedArrow}
                                    suffixColor={feedArrow === '↓' ? c.warningText : c.textSecondary}
                                    color={p.feed.kg > 0 ? c.textPrimary : c.textTertiary}
                                />
                                <Figure
                                    label={t('dailyBrief.ponds.deaths')}
                                    value={deaths != null ? String(deaths) : dash}
                                    color={deaths == null ? c.textTertiary : p.score?.reasons.some((r) => r.code.startsWith('mortality')) ? c.dangerText : c.textPrimary}
                                />
                            </View>
                        </TouchableOpacity>
                        {isToday && p.cycleActive && (
                            <TouchableOpacity onPress={() => onRoutine(p)} hitSlop={HIT} accessibilityRole="button" style={styles.routine}>
                                <Text style={styles.routineText}>{t('dailyBrief.ponds.routine')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
        </Section>
    );
};

const styles = StyleSheet.create({
    row: {
        paddingVertical: theme.spacing[3],
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.borderDefault,
    },
    firstRow: { borderTopWidth: 0, paddingTop: 0 },
    head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] },
    name: { ...theme.typeScale.labelLarge, fontSize: 15, color: c.textPrimary },
    doc: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    chip: {
        minWidth: 44,
        paddingHorizontal: theme.spacing[2.5],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
        alignItems: 'center',
    },
    chipValue: { ...theme.typeScale.numericMedium, fontFamily: 'DMMono-Medium' },
    chipText: { ...theme.typeScale.labelMedium },
    figures: { flexDirection: 'row', marginTop: theme.spacing[2] },
    figure: { flex: 1, minWidth: 0 },
    figValue: { ...theme.typeScale.numericMedium },
    figUnit: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    figLabel: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    routine: { alignSelf: 'flex-start', marginTop: theme.spacing[2], minHeight: 28, justifyContent: 'center' },
    routineText: { ...theme.typeScale.labelMedium, color: c.textLink },
});
