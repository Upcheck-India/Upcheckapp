/**
 * "How is my score worked out?" — the approved plain-language explanation and
 * this day's part-by-part breakdown, in a bottom sheet.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DayScore, ScorePart } from '../../api/dailyBrief';
import { BAND_TONE, c } from './Section';

const PARTS: ScorePart[] = ['water', 'feeding', 'health', 'care'];
const PARAGRAPHS = ['intro', 'water', 'feeding', 'health', 'care', 'notLogged', 'cap', 'bands', 'farm'] as const;

export const ScoreExplainerSheet: React.FC<{ visible: boolean; score: DayScore | null; onClose: () => void }> = ({
    visible,
    score,
    onClose,
}) => {
    const { t } = useTranslation();
    const mark = BAND_TONE[score?.band ?? 'none'].mark;
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('dailyBrief.explain.close')} />
            <View style={styles.sheet}>
                <View style={styles.grip} />
                <ScrollView contentContainerStyle={styles.body}>
                    <Text style={styles.title} accessibilityRole="header">{t('dailyBrief.explain.title')}</Text>
                    {PARAGRAPHS.map((p) => (
                        <Text key={p} style={styles.para}>{t(`dailyBrief.explain.${p}`)}</Text>
                    ))}

                    {!!score && (
                        <View style={styles.breakdown}>
                            <Text style={styles.subTitle}>{t('dailyBrief.explain.breakdown')}</Text>
                            {PARTS.map((part) => {
                                const p = score.parts[part];
                                const pct = p.measured && p.possible > 0 ? Math.min(1, p.earned / p.possible) : 0;
                                return (
                                    <View key={part} style={styles.partRow}>
                                        <Text style={styles.partName}>{t(`dailyBrief.parts.${part}`)}</Text>
                                        <View style={styles.partTrack}>
                                            {p.measured && <View style={[styles.partFill, { width: `${pct * 100}%`, backgroundColor: mark }]} />}
                                        </View>
                                        <Text style={[styles.partValue, !p.measured && styles.partMissing]}>
                                            {p.measured
                                                ? t('dailyBrief.score.partValue', { earned: Math.round(p.earned), possible: Math.round(p.possible) })
                                                : t('dailyBrief.score.partNotLogged')}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button">
                        <Text style={styles.closeText}>{t('dailyBrief.explain.close')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        maxHeight: '85%',
        backgroundColor: c.surface,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
    },
    grip: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: c.borderStrong,
        marginTop: theme.spacing[2],
    },
    body: { padding: theme.spacing[5], paddingBottom: theme.spacing[8] },
    title: { ...theme.typeScale.h1, color: c.textPrimary, marginBottom: theme.spacing[3] },
    para: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginBottom: theme.spacing[3] },
    breakdown: { marginTop: theme.spacing[2] },
    subTitle: { ...theme.typeScale.h3, color: c.textPrimary, marginBottom: theme.spacing[2] },
    partRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[2] },
    partName: { ...theme.typeScale.bodyMedium, color: c.textPrimary, width: 80 },
    partTrack: { flex: 1, height: 6, borderRadius: theme.radius.full, backgroundColor: c.surfaceVariant, overflow: 'hidden' },
    partFill: { height: 6, borderRadius: theme.radius.full },
    partValue: { ...theme.typeScale.numericSmall, color: c.textPrimary, minWidth: 72, textAlign: 'right' },
    partMissing: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    close: {
        marginTop: theme.spacing[5],
        minHeight: 48,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: c.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: { ...theme.typeScale.labelLarge, color: c.textPrimary },
});
