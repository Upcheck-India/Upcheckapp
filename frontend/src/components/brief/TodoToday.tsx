/**
 * "To do today" — tasks, logs still missing per pond (each a button to its log
 * screen), molt checklist items. On a past day the same list reads as done vs
 * missed, with no buttons: nothing can be logged into yesterday from here.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DailyBrief } from '../../api/dailyBrief';
import { Icon } from '../ui/Icon';
import { Section, Line, c } from './Section';

export type LogKind = 'water' | 'feed' | 'tray' | 'mortality';

const DONE = new Set(['done', 'verified']);
const MOLT_MARK = { critical: c.dangerBorder, important: c.warningBorder, routine: c.borderStrong } as const;

export const TodoToday: React.FC<{
    brief: DailyBrief;
    isPast: boolean;
    names: Record<string, string>;
    onLog: (kind: LogKind, pondId: string) => void;
    onRoute: (route: string, pondId: string) => void;
}> = ({ brief, isPast, names, onLog, onRoute }) => {
    const { t } = useTranslation();
    const { tasks, missingLogs, moltItems } = brief.todo;
    const tasksLive = tasks.filter((k) => k.status !== 'cancelled');
    const doneTasks = tasksLive.filter((k) => DONE.has(k.status)).length;
    const missing = missingLogs.filter((m) => m.kinds.length > 0);
    const total = tasksLive.length + moltItems.length;
    const done = doneTasks + moltItems.filter((m) => m.status === 'done').length;
    const empty = total === 0 && missing.length === 0;

    return (
        <Section
            title={t(isPast ? 'dailyBrief.blocks.todoPast' : 'dailyBrief.blocks.todo')}
            trailing={total > 0 ? t('dailyBrief.todo.doneCount', { done, total }) : null}
            testID="brief-todo"
        >
            {empty && <Line text={t(isPast ? 'dailyBrief.todo.nothingPast' : 'dailyBrief.todo.nothing')} muted />}

            {tasksLive.map((k) => {
                const isDone = DONE.has(k.status);
                return (
                    <View key={k.id} style={styles.task}>
                        <Icon
                            name={isDone ? 'check_circle' : isPast ? 'cancel' : 'radio_button_unchecked'}
                            size={20}
                            color={isDone ? c.successBorder : isPast ? c.dangerBorder : c.textTertiary}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                                style={[styles.taskTitle, isDone && styles.taskDone]}
                                accessibilityLabel={`${k.title}, ${t(isDone ? 'dailyBrief.todo.taskDone' : isPast ? 'dailyBrief.todo.taskMissed' : 'dailyBrief.todo.taskOpen')}`}
                            >
                                {k.title}
                            </Text>
                            {(k.pondId || k.assigneeNames.length > 0 || k.timeWindowStart) && (
                                <Text style={styles.meta}>
                                    {[k.timeWindowStart?.slice(0, 5), k.pondId ? names[k.pondId] : null, k.assigneeNames.length ? t('dailyBrief.todo.assignedTo', { names: k.assigneeNames.join(', ') }) : null]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </Text>
                            )}
                        </View>
                    </View>
                );
            })}

            {missing.length > 0 && (
                <Text style={styles.subhead}>{t(isPast ? 'dailyBrief.todo.missed' : 'dailyBrief.todo.missing')}</Text>
            )}
            {missing.map((m) => (
                <View key={m.pondId} style={styles.missingRow}>
                    <Text style={styles.pond} numberOfLines={1}>{names[m.pondId] ?? ''}</Text>
                    <View style={styles.chips}>
                        {m.kinds.map((kind) =>
                            isPast ? (
                                <Text key={kind} style={[styles.chip, styles.chipPast]}>{t(`dailyBrief.todo.kinds.${kind}`)}</Text>
                            ) : (
                                <TouchableOpacity
                                    key={kind}
                                    onPress={() => onLog(kind, m.pondId)}
                                    accessibilityRole="button"
                                    accessibilityLabel={t(
                                        { water: 'dailyBrief.todo.logWaterIn', feed: 'dailyBrief.todo.logFeedIn', tray: 'dailyBrief.todo.checkTrayIn', mortality: 'dailyBrief.todo.logDeathsIn' }[kind],
                                        { pond: names[m.pondId] ?? '' },
                                    )}
                                    style={styles.chipBtn}
                                >
                                    <Text style={styles.chip}>{t(`dailyBrief.todo.kinds.${kind}`)}</Text>
                                </TouchableOpacity>
                            ),
                        )}
                    </View>
                </View>
            ))}

            {moltItems.map((m) => (
                <Line
                    key={`${m.pondId}-${m.key}`}
                    text={t(`engines.lunar.item_${m.key}`)}
                    meta={`${names[m.pondId] ?? ''} · ${t(`dailyBrief.todo.moltStatus.${m.status}`)}`}
                    mark={m.status === 'violated' ? c.dangerBorder : m.status === 'done' ? c.successBorder : MOLT_MARK[m.priority]}
                    struck={m.status === 'done'}
                    actionLabel={!isPast && m.status === 'pending' && m.route ? t('engines.lunar.logIt') : undefined}
                    onAction={m.route ? () => onRoute(m.route!, m.pondId) : undefined}
                />
            ))}
        </Section>
    );
};

const styles = StyleSheet.create({
    task: { flexDirection: 'row', gap: theme.spacing[3], paddingVertical: theme.spacing[2], alignItems: 'flex-start' },
    taskTitle: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
    taskDone: { color: c.textTertiary, textDecorationLine: 'line-through' },
    meta: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    subhead: { ...theme.typeScale.labelMedium, color: c.textSecondary, marginTop: theme.spacing[3], marginBottom: theme.spacing[1] },
    missingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing[2],
        paddingVertical: theme.spacing[1.5],
    },
    pond: { ...theme.typeScale.bodyMedium, fontFamily: 'DMSans-SemiBold', color: c.textPrimary, minWidth: 72, flexShrink: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], flex: 1, justifyContent: 'flex-end' },
    chipBtn: { minHeight: 36, justifyContent: 'center' },
    chip: {
        ...theme.typeScale.labelMedium,
        color: c.textLink,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1.5],
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: c.borderStrong,
        overflow: 'hidden',
    },
    chipPast: { color: c.dangerText, borderColor: c.dangerBg, backgroundColor: c.dangerBg },
});
