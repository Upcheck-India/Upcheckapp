/** Numbers of the day — big tabular figures, small units, a quiet change against the day before. */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DailyBrief } from '../../api/dailyBrief';
import { fmtNum } from '../../features/dailyBriefText';
import { formatINR } from '../../features/inrFormat';
import { Section, c } from './Section';

interface Fig {
    key: string;
    label: string;
    value: string;
    unit?: string;
    delta?: string | null;
}

const signed = (n: number) => (n > 0 ? `+${fmtNum(n)}` : fmtNum(n));

export const DayNumbers: React.FC<{ brief: DailyBrief }> = ({ brief }) => {
    const { t } = useTranslation();
    const n = brief.totals;
    const vs = (cur: number, prev: number | null) =>
        prev == null ? null : t('dailyBrief.numbers.vsPrev', { delta: signed(Math.round((cur - prev) * 10) / 10) });

    const figs: Fig[] = [
        { key: 'feed', label: t('dailyBrief.numbers.feedKg'), value: fmtNum(n.feedKg), unit: 'kg', delta: vs(n.feedKg, n.feedKgPrev) },
        { key: 'deaths', label: t('dailyBrief.numbers.deaths'), value: String(n.mortality), delta: vs(n.mortality, n.mortalityPrev) },
        { key: 'tests', label: t('dailyBrief.numbers.waterTests'), value: String(n.waterTests) },
        { key: 'samplings', label: t('dailyBrief.numbers.samplings'), value: String(n.samplings) },
        { key: 'harvest', label: t('dailyBrief.numbers.harvestKg'), value: fmtNum(n.harvestKg), unit: 'kg' },
        { key: 'treatments', label: t('dailyBrief.numbers.treatments'), value: String(n.treatments) },
    ];
    if (brief.canViewFinancials && n.spend != null) figs.push({ key: 'spend', label: t('dailyBrief.numbers.spend'), value: formatINR(n.spend) });
    if (brief.canViewFinancials && n.income != null) figs.push({ key: 'income', label: t('dailyBrief.numbers.income'), value: formatINR(n.income) });

    return (
        <Section title={t('dailyBrief.blocks.numbers')} testID="brief-numbers">
            <View style={styles.grid}>
                {figs.map((f) => (
                    <View key={f.key} style={styles.cell} accessible accessibilityLabel={`${f.label}, ${f.value}${f.unit ? ` ${f.unit}` : ''}${f.delta ? `, ${f.delta}` : ''}`}>
                        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                            {f.value}
                            {!!f.unit && <Text style={styles.unit}>{` ${f.unit}`}</Text>}
                        </Text>
                        <Text style={styles.label}>{f.label}</Text>
                        {!!f.delta && <Text style={styles.delta}>{f.delta}</Text>}
                    </View>
                ))}
            </View>
        </Section>
    );
};

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing[4] },
    cell: { width: '50%', paddingRight: theme.spacing[3] },
    value: { ...theme.typeScale.numericLarge, color: c.textPrimary },
    unit: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    label: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    delta: { ...theme.typeScale.caption, color: c.textTertiary },
});
