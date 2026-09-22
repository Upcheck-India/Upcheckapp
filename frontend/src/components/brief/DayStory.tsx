/** "The day in short" — one sentence per story item, tone shown by icon AND colour. Absent/empty story ⇒ nothing. */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DailyBrief, StoryTone } from '../../api/dailyBrief';
import { storySentence } from '../../features/dailyBriefText';
import { Icon, type IconName } from '../ui/Icon';
import { Section, c } from './Section';

export const TONE: Record<StoryTone, { icon: IconName; color: string }> = {
    good: { icon: 'check_circle', color: c.successText },
    info: { icon: 'insights', color: c.textSecondary },
    watch: { icon: 'visibility', color: c.warningText },
    critical: { icon: 'warning', color: c.dangerText },
};

/**
 * `onHealthCheck`: a mortality spike offers "Do a health check" for its pond
 * (spec D6). Omitted (e.g. a read-only role) → the line alone.
 */
export const DayStory: React.FC<{ brief: DailyBrief; onHealthCheck?: (pondId: string) => void }> = ({ brief, onHealthCheck }) => {
    const { t } = useTranslation();
    const story = brief.story ?? [];
    if (!story.length) return null;
    return (
        <Section title={t('dailyBrief.story.title')} testID="brief-story">
            {story.map((item, i) => {
                const tone = TONE[item.tone] ?? TONE.info;
                const text = storySentence(item, brief, t);
                const check = item.code === 'mortality_spike' && !item.resolvedAt && !!item.pondId && !!onHealthCheck;
                return (
                    <View key={i}>
                        <View style={styles.row} accessible accessibilityLabel={`${t(`dailyBrief.story.tone.${item.tone}`)}: ${text}`} testID={`story-${item.code}`}>
                            <Icon name={tone.icon} size={20} color={tone.color} />
                            <View style={styles.text}>
                                <Text style={[styles.main, item.tone === 'critical' && styles.critical]}>{text}</Text>
                                {!!item.personName && <Text style={styles.meta}>{t('dailyBrief.story.by', { name: item.personName })}</Text>}
                            </View>
                        </View>
                        {check && (
                            <TouchableOpacity
                                style={styles.action}
                                onPress={() => onHealthCheck!(item.pondId!)}
                                accessibilityRole="button"
                                testID={`story-health-check-${item.pondId}`}
                            >
                                <Text style={styles.actionText}>{t('health.doCheck')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
        </Section>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: theme.spacing[3], paddingVertical: theme.spacing[1.5], alignItems: 'flex-start' },
    text: { flex: 1, minWidth: 0 },
    main: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
    critical: { fontFamily: 'DMSans-SemiBold', color: c.dangerText },
    meta: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    action: {
        alignSelf: 'flex-start',
        marginLeft: 32,
        marginBottom: theme.spacing[1.5],
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1.5],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: c.primary,
    },
    actionText: { ...theme.typeScale.labelMedium, color: c.primary },
});
